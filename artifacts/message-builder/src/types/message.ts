export interface RoleMention {
  id: string;
  name: string;
  color: string;
}

export interface ButtonItem {
  id: string;
  label: string;
  emoji: string;
  style: "primary" | "secondary" | "success" | "danger";
}

export type BlockType = "text" | "roles" | "separator" | "buttons" | "divider";

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

export interface ButtonsBlock {
  id: string;
  type: "buttons";
  items: ButtonItem[];
}

export interface DividerBlock {
  id: string;
  type: "divider";
}

export type Block = TextBlock | RolesBlock | SeparatorBlock | ButtonsBlock | DividerBlock;

export interface MessageGroup {
  id: string;
  borderColor: string;
  blocks: Block[];
}
