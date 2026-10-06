import React from 'react';
import {
  LayoutDashboard,
  AlertTriangle,
  Network,
  GitFork,
  Briefcase,
  Database,
  Sliders,
  Play,
  LogOut,
  User,
  CheckCircle2,
  XCircle,
  ExternalLink,
  ArrowRight,
  ArrowLeft,
  Filter,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  FileText,
  History,
  Plus,
  RefreshCw,
  ShieldAlert,
  Edit3,
  Save,
  HelpCircle,
  Send,
  Hash,
  Layers,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Trash2,
  LucideProps,
} from 'lucide-react';

/**
 * Strict allowlist of permitted icons.
 * Prohibits Sparkles, Bot, Brain, and decorative imagery per design rules.
 */
const ICON_MAP = {
  dashboard: LayoutDashboard,
  alerts: AlertTriangle,
  rings: Network,
  graph: GitFork,
  cases: Briefcase,
  data: Database,
  rules: Sliders,
  play: Play,
  logout: LogOut,
  user: User,
  check: CheckCircle2,
  close: X,
  error: XCircle,
  external: ExternalLink,
  arrowRight: ArrowRight,
  arrowLeft: ArrowLeft,
  filter: Filter,
  search: Search,
  chevronLeft: ChevronLeft,
  chevronRight: ChevronRight,
  chevronDown: ChevronDown,
  chevronUp: ChevronUp,
  fileText: FileText,
  history: History,
  plus: Plus,
  refresh: RefreshCw,
  shield: ShieldAlert,
  edit: Edit3,
  save: Save,
  help: HelpCircle,
  send: Send,
  hash: Hash,
  layers: Layers,
  zoomIn: ZoomIn,
  zoomOut: ZoomOut,
  maximize: Maximize2,
  trash: Trash2,
} as const;

export type IconName = keyof typeof ICON_MAP;

interface IconProps extends Omit<LucideProps, 'strokeWidth'> {
  name: IconName;
  size?: number;
  className?: string;
  'aria-label'?: string;
}

/**
 * Monochromatic SVG Icon wrapper enforcing 1.5px stroke width.
 * All icons inherit currentColor and avoid decorative AI tropes.
 */
export const Icon: React.FC<IconProps> = ({
  name,
  size = 16,
  className,
  'aria-label': ariaLabel,
  ...props
}) => {
  const Component = ICON_MAP[name];
  if (!Component) {
    return null;
  }

  return (
    <Component
      size={size}
      strokeWidth={1.5}
      color="currentColor"
      className={className}
      aria-hidden={!ariaLabel}
      aria-label={ariaLabel}
      role={ariaLabel ? 'img' : 'presentation'}
      {...props}
    />
  );
};
