import LegalDocPage from "@/components/legal/LegalDocPage";
import content from "../../docs/legal/Cookie-Policy.md?raw";

export default function CookiePolicy() {
  return <LegalDocPage title="Cookie Policy" content={content} />;
}
