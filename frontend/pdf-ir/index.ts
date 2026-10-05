import { type Block } from './pdf-ir';
import { type ActionBlockData, type DialogueBlockData, type OtherBlockData } from './analyzer';

export { convertDocument } from './pdf-ir';
export { type Page, type Block as BaseBlock, analyzeDocument } from './analyzer';

export type ActionBlock = Block & ActionBlockData;
export type DialogueBlock = Block & DialogueBlockData;
export type OtherBlock = Block & OtherBlockData;
