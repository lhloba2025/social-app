import React, { useState, useEffect } from "react";
import { MessageCircle, Loader2, Send, RefreshCw, ExternalLink, Inbox, CornerDownLeft, Heart, Share2, Eye } from "lucide-react";
import { platformEmoji, platformLabel } from "@/components/BulkMediaUploadModal";
import { tenantToken } from "@/api/localClient";

// Engagement inbox — browse YOUR connected posts (Instagram + Facebook), read
// comments, and reply. Owner's own accounts only (platforms don't allow public
// feed browsing). Replies need engagement permissions on the connected account.

function authHeaders() {
  const t = tenantToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}
function timeAgo(iso, ar) {
  if (!iso) return "";
  try { return new Date(iso).toLocaleDateString(ar ? "ar-SA" : "en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }); }
  catch { return iso; }
}

export default function EngagementPage({ language }) {
  const ar = (language || localStorage.getItem("appLanguage") || "ar") === "ar";

  const [posts, setPosts] = useState([]);
  const [connected, setConnected] = useState(null);
  const [loadingFeed, setLoadingFeed] = useState(true);
  const [tab, setTab] = useState("all");           // all | instagram | facebook
  const [active, setActive] = useState(null);      // selected post
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentsError, setCommentsError] = useState("");
  const [replyText, setReplyText] = useState({});   // commentId -> text
  const [sending, setSending] = useState("");        // commentId being sent

  const loadFeed = async () => {
    setLoadingFeed(true);
    try {
      const res = await fetch("/api/engagement/feed", { headers: authHeaders() });
      const data = await res.json();
      setPosts(data.posts || []);
      setConnected(data.connected !== false);
    } catch { setPosts([]); setConnected(false); }
    finally { setLoadingFeed(false); }
  };
  useEffect(() => { loadFeed(); }, []);

  const openPost = async (post) => {
    setActive(post); setComments([]); setCommentsError(""); setLoadingComments(true);
    try {
      const res = await fetch(`/api/engagement/comments?platform=${post.platform}&postId=${encodeURIComponent(post.id)}`, { headers: authHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "error");
      setComments(data.comments || []);
    } catch (e) {
      setCommentsError(e?.message || String(e));
    } finally { setLoadingComments(false); }
  };

  const sendReply = async (comment) => {
    const message = (replyText[comment.id] || "").trim();
    if (!message) return;
    setSending(comment.id);
    try {
      const res = await fetch("/api/engagement/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ platform: active.platform, commentId: comment.id, message }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "error");
      setReplyText((p) => ({ ...p, [comment.id]: "" }));
      openPost(active); // refresh
    } catch (e) {
      alert((ar ? "تعذّر الرد: " : "Reply failed: ") + (e?.message || e));
    } finally { setSending(""); }
  };

  return (
    <div dir={ar ? "rtl" : "ltr"} className="h-full overflow-hidden flex flex-col" style={{ background: "var(--hv-app-bg)", color: "var(--hv-text)" }}>
      <div className="px-6 py-4 flex items-center justify-between flex-shrink-0" style={{ borderBottom: "1px solid var(--hv-border)", background: "var(--hv-surface)" }}>
        <div>
          <h1 className="hv-page-title flex items-center gap-2"><MessageCircle className="w-5 h-5" style={{ color: "var(--hv-primary)" }} />{ar ? "صندوق التفاعل" : "Engagement"}</h1>
          <p className="hv-page-sub">{ar ? "منشوراتك وتعليقاتها" : "Your posts & comments"}</p>
          <p className="text-[11px] mt-2 px-2.5 py-1.5 rounded-lg" style={{ background: "rgba(79,70,229,0.06)", border: "1px solid var(--hv-border)", color: "var(--hv-text-soft)" }}>{ar ? "ℹ️ أسماء المعلّقين والمشاهدات والرد وفيسبوك تنفعّل مع النسخة الرسمية (مراجعة Meta)." : "ℹ️ Commenter names, views, replies & Facebook unlock with the official version (Meta review)."}</p>
        </div>
        <button onClick={loadFeed} className="p-2 rounded-lg transition" style={{ color: "var(--hv-text-soft)" }} title={ar ? "تحديث" : "Refresh"}><RefreshCw className="w-4 h-4" /></button>
      </div>

      {loadingFeed ? (
        <div className="flex-1 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--hv-primary)" }} /></div>
      ) : connected === false ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2" style={{ color: "var(--hv-text-soft)" }}>
          <Inbox className="w-12 h-12 opacity-40" />
          <p>{ar ? "ما فيه حساب مرتبط بعد." : "No connected account yet."}</p>
          <a href="/AccountsPage" className="underline text-sm" style={{ color: "var(--hv-primary)" }}>{ar ? "اربط حساباتك ←" : "Connect accounts →"}</a>
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden">
          {/* Posts list */}
          <div className="w-[330px] flex-shrink-0 flex flex-col" style={{ borderInlineEnd: "1px solid var(--hv-border)" }}>
            {/* Platform tabs */}
            <div className="flex gap-1 p-2 flex-shrink-0" style={{ borderBottom: "1px solid var(--hv-border)", background: "var(--hv-surface-2, #f6f7fb)" }}>
              {[
                { id: "all", label: ar ? "الكل" : "All", n: posts.length },
                { id: "instagram", label: ar ? "انستقرام" : "Instagram", n: posts.filter((p) => p.platform === "instagram").length },
                { id: "facebook", label: ar ? "فيسبوك" : "Facebook", n: posts.filter((p) => p.platform === "facebook").length },
              ].map((t) => (
                <button key={t.id} onClick={() => { setTab(t.id); setActive(null); }}
                  className="flex-1 py-1.5 rounded-lg text-[11px] font-bold transition"
                  style={tab === t.id
                    ? { background: "var(--hv-primary)", color: "#fff" }
                    : { background: "var(--hv-surface)", color: "var(--hv-text-soft)", border: "1px solid var(--hv-border)" }}>
                  {t.label} ({t.n})
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto">
              {(tab === "all" ? posts : posts.filter((p) => p.platform === tab)).length === 0 ? (
                <div className="p-6 text-center text-sm" style={{ color: "var(--hv-text-soft)" }}>{ar ? "لا توجد منشورات." : "No posts."}</div>
              ) : (tab === "all" ? posts : posts.filter((p) => p.platform === tab)).map((p) => (
                <button key={p.id} onClick={() => openPost(p)}
                  className="w-full text-start p-3 flex gap-3 transition"
                  style={{ borderBottom: "1px solid var(--hv-border)", background: active?.id === p.id ? "var(--hv-surface-2, #f6f7fb)" : "transparent" }}>
                  {p.image ? <img src={p.image} alt="" className="w-12 h-12 rounded object-cover flex-shrink-0" /> : <div className="w-12 h-12 rounded flex-shrink-0" style={{ background: "var(--hv-surface-2, #f6f7fb)" }} />}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-[10px]" style={{ color: "var(--hv-text-faint)" }}>
                      <span>{platformEmoji(p.platform)}</span><span>{platformLabel(p.platform, ar)}</span>
                      <span className="ms-auto">{timeAgo(p.created, ar)}</span>
                    </div>
                    <p className="text-[12px] line-clamp-2 mt-0.5" style={{ color: "var(--hv-text)" }}>{p.message || (ar ? "بدون نص" : "No text")}</p>
                    <div className="flex items-center gap-3 text-[10px] mt-1" style={{ color: "var(--hv-text-soft)" }}>
                      {p.viewsCount > 0 && <span className="inline-flex items-center gap-0.5 text-sky-600"><Eye className="w-3 h-3" />{p.viewsCount}</span>}
                      <span className="inline-flex items-center gap-0.5 text-pink-600"><Heart className="w-3 h-3" />{p.likesCount || 0}</span>
                      <span className="inline-flex items-center gap-0.5" style={{ color: "var(--hv-primary)" }}><MessageCircle className="w-3 h-3" />{p.commentsCount || 0}</span>
                      {p.platform === "facebook" && <span className="inline-flex items-center gap-0.5"><Share2 className="w-3 h-3" />{p.sharesCount || 0}</span>}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Comments pane */}
          <div className="flex-1 overflow-y-auto p-5">
            {!active ? (
              <div className="h-full flex flex-col items-center justify-center gap-2" style={{ color: "var(--hv-text-faint)" }}><MessageCircle className="w-12 h-12 opacity-40" /><p className="text-sm">{ar ? "اختر منشوراً لعرض تعليقاته" : "Pick a post to see its comments"}</p></div>
            ) : (
              <div className="max-w-2xl mx-auto">
                <div className="flex items-center gap-3 mb-4 flex-wrap">
                  <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ background: "var(--hv-surface-2, #f6f7fb)", color: "var(--hv-text)", border: "1px solid var(--hv-border)" }}>{platformEmoji(active.platform)} {platformLabel(active.platform, ar)}</span>
                  {active.viewsCount > 0 && <span className="text-xs text-sky-600 inline-flex items-center gap-1"><Eye className="w-3.5 h-3.5" />{active.viewsCount} {ar ? "مشاهدة" : "views"}</span>}
                  <span className="text-xs text-pink-600 inline-flex items-center gap-1"><Heart className="w-3.5 h-3.5" />{active.likesCount || 0} {ar ? "إعجاب" : "likes"}</span>
                  <span className="text-xs inline-flex items-center gap-1" style={{ color: "var(--hv-primary)" }}><MessageCircle className="w-3.5 h-3.5" />{active.commentsCount || 0} {ar ? "تعليق" : "comments"}</span>
                  {active.platform === "facebook" && <span className="text-xs inline-flex items-center gap-1" style={{ color: "var(--hv-text-soft)" }}><Share2 className="w-3.5 h-3.5" />{active.sharesCount || 0} {ar ? "مشاركة" : "shares"}</span>}
                  {active.permalink && <a href={active.permalink} target="_blank" rel="noopener noreferrer" className="text-xs inline-flex items-center gap-1 ms-auto" style={{ color: "var(--hv-primary)" }}>{ar ? "فتح المنشور" : "Open post"} <ExternalLink className="w-3 h-3" /></a>}
                </div>
                <p className="text-sm mb-4 line-clamp-3" style={{ color: "var(--hv-text-soft)" }}>{active.message}</p>

                {loadingComments ? (
                  <div className="py-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--hv-primary)" }} /></div>
                ) : commentsError ? (
                  <div className="rounded-lg p-3 text-[12px] leading-relaxed" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)", color: "#92400e" }}>
                    {ar ? "تعذّر تحميل التعليقات. غالباً تحتاج تفعيل صلاحية التفاعل من Meta وإعادة الربط." : "Couldn't load comments — engagement permission may be needed."}
                    <div className="mt-1 text-[10px]" dir="ltr" style={{ color: "#b45309" }}>{commentsError}</div>
                  </div>
                ) : comments.length === 0 ? (
                  <div className="text-sm py-8 text-center" style={{ color: "var(--hv-text-soft)" }}>{ar ? "لا توجد تعليقات على هذا المنشور." : "No comments on this post."}</div>
                ) : (
                  <div className="space-y-3">
                    {comments.map((c) => (
                      <div key={c.id} className="hv-card p-3">
                        <div className="flex items-center gap-2 text-[12px]"><span className="font-bold" style={{ color: "var(--hv-text)" }}>{c.from || (ar ? "زائر" : "Visitor")}</span><span className="text-[10px]" style={{ color: "var(--hv-text-faint)" }}>{timeAgo(c.created, ar)}</span></div>
                        <p className="text-[13px] mt-1" dir="auto" style={{ color: "var(--hv-text-soft)" }}>{c.text}</p>

                        {c.replies?.length > 0 && (
                          <div className="mt-2 ps-3 space-y-1.5" style={{ borderInlineStart: "2px solid var(--hv-border)" }}>
                            {c.replies.map((rp) => (
                              <div key={rp.id} className="text-[12px]"><span className="font-bold" style={{ color: "var(--hv-text)" }}>{rp.from}</span> <span style={{ color: "var(--hv-text-soft)" }} dir="auto">{rp.text}</span></div>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center gap-2 mt-2">
                          <input value={replyText[c.id] || ""} onChange={(e) => setReplyText((p) => ({ ...p, [c.id]: e.target.value }))}
                            onKeyDown={(e) => { if (e.key === "Enter") sendReply(c); }}
                            placeholder={ar ? "اكتب رداً…" : "Write a reply…"}
                            className="hv-input flex-1 px-3 py-1.5 text-[12px]" />
                          <button onClick={() => sendReply(c)} disabled={sending === c.id || !(replyText[c.id] || "").trim()}
                            className="hv-btn hv-btn-primary px-3 py-1.5 text-xs font-bold disabled:opacity-50 inline-flex items-center gap-1">
                            {sending === c.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CornerDownLeft className="w-3.5 h-3.5" />}{ar ? "رد" : "Reply"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
