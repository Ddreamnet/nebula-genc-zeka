// `Image as ImageIcon`: importing lucide's icon under its bare name shadows
// the global Image constructor AND makes jsx-a11y read `<Image />` as an
// `<img>` missing its alt text.
import { ExternalLink, FileText, Video, Link as LinkIcon, Image as ImageIcon } from "lucide-react";

/** Icon for a resource type — used by student topic sections across the panel. */
export function getResourceIcon(type: string, className = "h-4 w-4") {
  switch (type) {
    case "video":
      return <Video className={className} />;
    case "pdf":
    case "document":
      return <FileText className={className} />;
    case "link":
      return <LinkIcon className={className} />;
    case "image":
      return <ImageIcon className={className} />;
    default:
      return <ExternalLink className={className} />;
  }
}
