export interface NavbarMenuAction {
  id: string;
  label: string;
  onSelect: () => void;
  disabled?: boolean;
}
