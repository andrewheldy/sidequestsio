import LegalDocPage from "@/components/legal/LegalDocPage";
import content from "../../docs/legal/Community-Guidelines.md?raw";

export default function CommunityGuidelines() {
  return <LegalDocPage title="Community Guidelines" content={content} />;
}
