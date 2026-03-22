import { graphql, buildSchema, GraphQLSchema } from 'graphql';
import { typeDefs } from './schema';
import { resolvers } from './resolvers';
import { Express, Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';

// Create executable schema
const schema = buildSchema(typeDefs.loc!.source.body);

export async function setupGraphQL(app: Express) {
  app.post('/graphql', async (req: any, res: Response) => {
    const { query, variables } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'No query provided' });
    }

    try {
      const result = await graphql({
        schema,
        source: query,
        variableValues: variables,
        rootValue: resolvers,
        contextValue: { req: req as AuthenticatedRequest }
      });

      res.json(result);
    } catch (error: any) {
      console.error('GraphQL error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  console.log('📡 GraphQL endpoint ready at /graphql');
}
