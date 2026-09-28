import { DiscoveryEmblem, TopoLines } from "./QuestDecor";

/** Short venue/quest description beside the discovery emblem. */
export function QuestIntro({ text }: { text: string | null }) {
  return (
    <section className="relative px-5 pt-5">
      <TopoLines className="absolute -left-10 -top-24 h-64 w-[140%] text-sand-50/[0.05]" />
      <div className="relative flex items-start gap-3">
        {text ? (
          <p className="flex-1 text-[15.5px] leading-relaxed text-sand-50/75">{text}</p>
        ) : (
          <div className="flex-1" />
        )}
        <DiscoveryEmblem className="-mt-2 hidden min-[360px]:block" />
      </div>
    </section>
  );
}

export default QuestIntro;
