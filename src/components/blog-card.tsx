import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { formatPostDate, readingMinutes, type BlogPost } from "@/lib/blog-posts";

// One article in a list: picture, topic, title, a short intro and the reading time.
export function BlogCard({ post }: { post: BlogPost }) {
  // The card takes five rows of the list's grid (picture, topic, title, intro, footer) so that in a row of cards
  // the topics, titles, intros and dates each line up, however many lines a title runs to.
  return (
    <Link to="/blog/$slug" params={{ slug: post.slug }} data-static className="group row-span-5 grid grid-rows-subgrid gap-y-0 overflow-hidden rounded-3xl border border-line/70 bg-paper transition-colors hover:bg-[#FFF7D6]/50">
      <img src={post.image} alt={post.imageAlt} width={1200} height={630} loading="lazy" decoding="async" className="aspect-[1200/630] w-full object-cover" />
      <p className="px-6 pt-6 text-xs uppercase tracking-[0.2em] text-[#4A7CAD]">{post.category}</p>
      <h3 className="mt-3 px-6 font-serif text-2xl leading-tight text-pretty">{post.title}</h3>
      <p className="mt-3 px-6 text-sm leading-relaxed text-muted-foreground">{post.excerpt}</p>
      <p className="mt-5 flex items-center justify-between px-6 pb-6 text-xs text-muted-foreground">
        <span>{formatPostDate(post.published)} · {readingMinutes(post)} min read</span>
        <span className="inline-flex items-center gap-1.5 text-sm text-[#4A7CAD] transition-all group-hover:gap-2.5">Read <ArrowRight className="h-3.5 w-3.5" /></span>
      </p>
    </Link>
  );
}
