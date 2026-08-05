import { ExternalLink, FileText, Video, Link as LinkIcon, Image } from "lucide-react";

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
      return <Image className={className} />;
    default:
      return <ExternalLink className={className} />;
  }
}
