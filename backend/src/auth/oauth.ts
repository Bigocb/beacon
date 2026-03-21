import axios from 'axios';
import jwt from 'jsonwebtoken';
import pool from '../db/connection';

interface MicrosoftTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}

interface MinecraftProfile {
  id: string;
  name: string;
}

export async function exchangeCodeForToken(
  code: string
): Promise<{ accessToken: string; refreshToken?: string }> {
  try {
    const params = new URLSearchParams();
    params.append('client_id', process.env.MINECRAFT_CLIENT_ID || '');
    params.append('client_secret', process.env.MINECRAFT_CLIENT_SECRET || '');
    params.append('code', code);
    params.append('grant_type', 'authorization_code');
    params.append('redirect_uri', process.env.REDIRECT_URI || 'http://localhost:8080/minecraft/auth/callback');

    const response = await axios.post<MicrosoftTokenResponse>(
      'https://login.live.com/oauth20_token.srf',
      params,
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }
    );

    return {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
    };
  } catch (error: any) {
    console.error('Failed to exchange code for token:');
    console.error('Status:', error.response?.status);
    console.error('Data:', JSON.stringify(error.response?.data, null, 2));
    console.error('Message:', error.message);
    throw new Error('OAuth token exchange failed');
  }
}

export async function getMinecraftProfile(
  microsoftAccessToken: string
): Promise<MinecraftProfile> {
  try {
    // First, get Xbox token
    const xboxResponse = await axios.post(
      'https://user.auth.xboxlive.com/user/authenticate',
      {
        Properties: {
          AuthMethod: 'RPS',
          SiteName: 'user.auth.xboxlive.com',
          RpsTicket: `d=${microsoftAccessToken}`,
        },
        RelyingParty: 'http://auth.xboxlive.com',
        TokenType: 'JWT',
      }
    );

    const xboxToken = xboxResponse.data.Token;

    // Then, get XSTS token
    const xstsResponse = await axios.post(
      'https://xsts.auth.xboxlive.com/xsts/authorize',
      {
        Properties: {
          SandboxId: 'RETAIL',
          UserTokens: [xboxToken],
        },
        RelyingParty: 'rp://api.minecraftservices.com/',
        TokenType: 'JWT',
      }
    );

    const xstsToken = xstsResponse.data.Token;
    const userHash = xstsResponse.data.DisplayClaims.xui[0].uhs;

    // Finally, get Minecraft token
    const mcResponse = await axios.post(
      'https://api.minecraftservices.com/authentication/login_with_xbox',
      {
        identityToken: `XBL3.0 x=${userHash};${xstsToken}`,
      }
    );

    const mcAccessToken = mcResponse.data.access_token;

    // Get Minecraft profile
    const profileResponse = await axios.get<MinecraftProfile>(
      'https://api.minecraftservices.com/minecraft/profile',
      {
        headers: {
          Authorization: `Bearer ${mcAccessToken}`,
        },
      }
    );

    return {
      id: profileResponse.data.id,
      name: profileResponse.data.name,
    };
  } catch (error) {
    console.error('Failed to get Minecraft profile:', error);
    throw new Error('Failed to retrieve Minecraft profile');
  }
}

export async function createOrUpdateUser(
  minecraftUuid: string,
  username: string,
  email?: string
) {
  const query = `
    INSERT INTO users (minecraft_uuid, username, email, created_at, updated_at)
    VALUES ($1, $2, $3, NOW(), NOW())
    ON CONFLICT (minecraft_uuid) DO UPDATE
    SET username = EXCLUDED.username,
        email = COALESCE(EXCLUDED.email, users.email),
        updated_at = NOW()
    RETURNING *;
  `;

  const result = await pool.query(query, [minecraftUuid, username, email || null]);
  return result.rows[0];
}

export function generateJWT(minecraftUuid: string): string {
  const secret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
  const token = jwt.sign({ uuid: minecraftUuid }, secret, {
    expiresIn: '7d',
  });
  return token;
}

export function verifyJWT(token: string): { uuid: string } | null {
  try {
    const secret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
    const decoded = jwt.verify(token, secret) as { uuid: string };
    return decoded;
  } catch (error) {
    return null;
  }
}
