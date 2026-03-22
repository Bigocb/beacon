import { gql } from 'apollo-server-express';

export const typeDefs = gql`
  type User {
    minecraft_uuid: String!
    username: String!
    auth_token: String
    avatar_url: String
    created_at: String!
  }

  type SaveFolder {
    id: String!
    user_uuid: String!
    folder_path: String!
    display_name: String!
    created_at: String!
  }

  type Instance {
    folder_id: String!
    display_name: String!
    instance_name: String
    mod_loader: String!
    loader_version: String
    game_version: String
    instance_type: String!
    launcher: String
    mod_count: Int
    save_count: Int!
    saves: [Save!]!
  }

  type Save {
    id: String!
    folder_id: String
    world_name: String!
    version: String
    game_mode: String
    difficulty: Int
    seed: Int
    play_time_ticks: Int
    spawn_x: Int
    spawn_y: Int
    spawn_z: Int
    health: Int
    hunger: Int
    level: Int
    xp: Float
    food_eaten: Int
    beds_slept_in: Int
    deaths: Int
    blocks_mined: Int
    blocks_placed: Int
    items_crafted: Int
    mobs_killed: Int
    damage_taken: Float
    last_played: String
    created_at: String!
    updated_at: String!
  }

  type PlayerStat {
    uuid: String!
    name: String
    health: Int
    hunger: Int
    level: Int
    xp: Float
  }

  type Query {
    # User queries
    currentUser: User
    user(minecraft_uuid: String!): User

    # Instance queries
    instances: [Instance!]!
    instance(folder_id: String!): Instance

    # Save queries
    saves(limit: Int, offset: Int): SaveConnection!
    save(id: String!): Save
    savesByInstance(folder_id: String!): [Save!]!

    # Folder queries
    folders: [SaveFolder!]!
    folder(id: String!): SaveFolder

    # Favorites queries
    getFavorites: [String!]!
  }

  type SaveConnection {
    saves: [Save!]!
    total: Int!
    limit: Int!
    offset: Int!
  }

  type Mutation {
    # Create/update saves
    batchUpsertSaves(saves: [SaveInput!]!): BatchUpsertResult!
    updateSave(id: String!, data: SaveUpdateInput!): Save!

    # Manage folders
    createFolder(folder_path: String!, display_name: String!): SaveFolder!
    deleteFolder(id: String!): Boolean!

    # Manage favorites
    addFavorite(instanceFolderId: String!): Boolean!
    removeFavorite(instanceFolderId: String!): Boolean!
  }

  input SaveInput {
    id: String!
    user_uuid: String!
    folder_id: String
    world_name: String!
    file_path: String!
    version: String
    game_mode: String
    difficulty: Int
    seed: Int
    play_time_ticks: Int
    spawn_x: Int
    spawn_y: Int
    spawn_z: Int
    health: Int
    hunger: Int
    level: Int
    xp: Float
    food_eaten: Int
    beds_slept_in: Int
    deaths: Int
    blocks_mined: Int
    blocks_placed: Int
    items_crafted: Int
    mobs_killed: Int
    damage_taken: Float
  }

  input SaveUpdateInput {
    world_name: String
    version: String
    health: Int
    hunger: Int
    level: Int
    xp: Float
  }

  type BatchUpsertResult {
    inserted: Int!
    updated: Int!
    message: String!
  }
`;
