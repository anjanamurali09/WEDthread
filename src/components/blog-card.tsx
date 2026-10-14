import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { formatPostDate, readingMinutes, type BlogPost } from "@/lib/blog-posts";

// One article in a list: picture, topic, title, a short intro and the reading time.
export function BlogCard({ post }: { post: BlogPost }) {
  return (
    <Link to="/blog/$slug" params={{ slug: post.slug }} data-static className="group flex h-full flex-col overflow-hidden rounded-3xl border border-line/70 bg-paper transition-colors hover:bg-[#FFF7D6]/50">
      <img src={post.image} alt={post.imageAlt} width={1200} height={630} loading="lazy" decoding="async" className="aspect-[1200/630] w-full object-cover" />
      <div className="flex flex-1 flex-col p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-[#4A7CAD]">{post.category}</p>
        <h3 className="mt-3 font-serif text-2xl leading-tight text-balance">{post.title}</h3>
        <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">{post.excerpt}</p>
        <p className="mt-5 flex items-center justify-between text-xs text-muted-foreground">
          <span>{formatPostDate(post.published)} · {readingMinutes(post)} min read</span>
          <span className="inline-flex items-center gap-1.5 text-sm text-[#4A7CAD] transition-all group-hover:gap-2.5">Read <ArrowRight className="h-3.5 w-3.5" /></span>
        </p>
      </div>
    </Link>
  );
}
