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
    seed: String
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
    file_path: String
    instance_name: String
    mod_loader: String
    loader_version: String
    game_version: String
    instance_type: String
    launcher: String
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

  type UserStats {
    user_uuid: String!
    username: String!
    saves_count: Int!
    total_playtime_ticks: Int!
    total_playtime_hours: Float!
    highest_level: Int!
    total_mobs_killed: Int!
    total_blocks_mined: Int!
    total_blocks_placed: Int!
    total_deaths: Int!
    total_damage_taken: Float!
    total_food_eaten: Int!
    total_beds_slept_in: Int!
    total_items_crafted: Int!
    worlds_visited: Int!
    average_playtime_per_world: Float!
    updated_at: String!
  }

  type LeaderboardEntry {
    rank: Int!
    username: String!
    user_uuid: String!
    saves_count: Int!
    value: Float!
    metric: String!
  }

  type Tag {
    id: String!
    user_uuid: String!
    name: String!
    color: String
    created_at: String!
  }

  type Note {
    id: String!
    save_id: String!
    title: String
    content: String!
    note_type: String!
    timestamp: String!
    created_at: String!
    updated_at: String!
    deleted_at: String
    tags: [Tag!]!
  }

  type Milestone {
    id: String!
    save_id: String!
    name: String!
    description: String
    target_play_time_ticks: Int
    achieved_at: String
    position: Int!
    created_at: String!
    updated_at: String!
  }

  type WorldMetadata {
    save_id: String!
    description: String
    is_favorite: Boolean!
    theme_color: String
    world_type: String
    modpack_name: String
    modpack_version: String
    project_id: String
    archived_at: String
    created_at: String!
    updated_at: String!
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

    # Tags queries
    tags: [Tag!]!

    # Notes queries
    notes(saveId: String!): [Note!]!
    note(id: String!): Note

    # Milestones queries
    milestones(saveId: String!): [Milestone!]!
    milestone(id: String!): Milestone

    # Metadata queries
    metadata(saveId: String!): WorldMetadata

    # Stats & Leaderboard queries
    myStats: UserStats
    leaderboard(metric: String!, limit: Int): [LeaderboardEntry!]!
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

    # Tags mutations
    createTag(name: String!, color: String): Tag!
    updateTag(id: String!, name: String, color: String): Tag!
    deleteTag(id: String!): Boolean!

    # Notes mutations
    createNote(saveId: String!, data: CreateNoteInput!): Note!
    updateNote(id: String!, data: UpdateNoteInput!): Note!
    deleteNote(id: String!): Boolean!
    addNoteTag(noteId: String!, tagId: String!): Boolean!
    removeNoteTag(noteId: String!, tagId: String!): Boolean!

    # Milestones mutations
    createMilestone(saveId: String!, data: CreateMilestoneInput!): Milestone!
    updateMilestone(id: String!, data: UpdateMilestoneInput!): Milestone!
    deleteMilestone(id: String!): Boolean!

    # Metadata mutations
    createMetadata(saveId: String!, data: CreateMetadataInput!): WorldMetadata!
    updateMetadata(saveId: String!, data: UpdateMetadataInput!): WorldMetadata!
  }

  input SaveInput {
    id: String!
    user_uuid: String
    folder_id: String
    world_name: String!
    file_path: String
    version: String
    game_mode: String
    difficulty: Int
    seed: String
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
    instance_name: String
    mod_loader: String
    loader_version: String
    game_version: String
    instance_type: String
    launcher: String
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

  input CreateNoteInput {
    title: String
    content: String!
    note_type: String
    timestamp: String!
    tag_ids: [String!]
  }

  input UpdateNoteInput {
    title: String
    content: String
    note_type: String
    timestamp: String
    tag_ids: [String!]
  }

  input CreateMilestoneInput {
    name: String!
    description: String
    target_play_time_ticks: Int
    position: Int
  }

  input UpdateMilestoneInput {
    name: String
    description: String
    target_play_time_ticks: Int
    position: Int
    achieved_at: String
  }

  input CreateMetadataInput {
    description: String
    is_favorite: Boolean
    theme_color: String
    world_type: String!
    modpack_name: String
    modpack_version: String
    project_id: String
  }

  input UpdateMetadataInput {
    description: String
    is_favorite: Boolean
    theme_color: String
    world_type: String
    modpack_name: String
    modpack_version: String
    project_id: String
  }
`;
