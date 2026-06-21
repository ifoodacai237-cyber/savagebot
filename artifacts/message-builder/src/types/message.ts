export interface RoleMention {
  id: string;
  name: string;
  color: string;
}

export type BlockType = "text" | "roles" | "separator";

export interface TextBlock {
  id: string;
  type: "text";
  content: string;
}

export interface RolesBlock {
  id: string;
  type: "roles";
  roles: RoleMention[];
}

export interface SeparatorBlock {
  id: string;
  type: "separator";
  content: string;
}

export type Block = TextBlock | RolesBlock | SeparatorBlock;

export interface MessageGroup {
  id: string;
  borderColor: string;
  blocks: Block[];
}
