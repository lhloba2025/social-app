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
    <div dir={ar ? "rtl" : "ltr"} className="h-full overflow-hidden bg-slate-950 text-white flex flex-col">
      <div className="border-b border-slate-800 bg-slate-900 px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2"><MessageCircle className="w-5 h-5 text-indigo-400" />{ar ? "صندوق التفاعل" : "Engagement"}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{ar ? "منشوراتك — اقرأ التعليقات وردّ عليها" : "Your posts — read & reply to comments"}</p>
        </div>
        <button onClick={loadFeed} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition" title={ar ? "تحديث" : "Refresh"}><RefreshCw className="w-4 h-4" /></button>
      </div>

      {loadingFeed ? (
        <div className="flex-1 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-400" /></div>
      ) : connected === false ? (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-2">
          <Inbox className="w-12 h-12 opacity-40" />
          <p>{ar ? "ما فيه حساب مرتبط بعد." : "No connected account yet."}</p>
          <a href="/AccountsPage" className="text-indigo-400 hover:text-indigo-300 underline text-sm">{ar ? "اربط حساباتك ←" : "Connect accounts →"}</a>
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden">
          {/* Posts list */}
          <div className="w-[330px] flex-shrink-0 border-e border-slate-800 flex flex-col">
            {/* Platform tabs */}
            <div className="flex gap-1 p-2 border-b border-slate-800 flex-shrink-0 bg-slate-900/60">
              {[
                { id: "all", label: ar ? "الكل" : "All", n: posts.length },
                { id: "instagram", label: ar ? "انستقرام" : "Instagram", n: posts.filter((p) => p.platform === "instagram").length },
                { id: "facebook", label: ar ? "فيسبوك" : "Facebook", n: posts.filter((p) => p.platform === "facebook").length },
              ].map((t) => (
                <button key={t.id} onClick={() => { setTab(t.id); setActive(null); }}
                  className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition ${tab === t.id ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`}>
                  {t.label} ({t.n})
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto">
              {(tab === "all" ? posts : posts.filter((p) => p.platform === tab)).length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-sm">{ar ? "لا توجد منشورات." : "No posts."}</div>
              ) : (tab === "all" ? posts : posts.filter((p) => p.platform === tab)).map((p) => (
                <button key={p.id} onClick={() => openPost(p)}
                  className={`w-full text-start p-3 border-b border-slate-800/60 flex gap-3 transition ${active?.id === p.id ? "bg-slate-800" : "hover:bg-slate-900"}`}>
                  {p.image ? <img src={p.image} alt="" className="w-12 h-12 rounded object-cover flex-shrink-0" /> : <div className="w-12 h-12 rounded bg-slate-800 flex-shrink-0" />}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                      <span>{platformEmoji(p.platform)}</span><span>{platformLabel(p.platform, ar)}</span>
                      <span className="ms-auto">{timeAgo(p.created, ar)}</span>
                    </div>
                    <p className="text-[12px] text-slate-200 line-clamp-2 mt-0.5">{p.message || (ar ? "بدون نص" : "No text")}</p>
                    <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-1">
                      {p.viewsCount > 0 && <span className="inline-flex items-center gap-0.5 text-sky-300"><Eye className="w-3 h-3" />{p.viewsCount}</span>}
                      <span className="inline-flex items-center gap-0.5 text-pink-300"><Heart className="w-3 h-3" />{p.likesCount || 0}</span>
                      <span className="inline-flex items-center gap-0.5 text-indigo-300"><MessageCircle className="w-3 h-3" />{p.commentsCount || 0}</span>
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
              <div className="h-full flex flex-col items-center justify-center text-slate-600 gap-2"><MessageCircle className="w-12 h-12 opacity-30" /><p className="text-sm">{ar ? "اختر منشوراً لعرض تعليقاته" : "Pick a post to see its comments"}</p></div>
            ) : (
              <div className="max-w-2xl mx-auto">
                <div className="flex items-center gap-3 mb-4 flex-wrap">
                  <span className="text-xs font-bold px-2 py-1 rounded-full bg-slate-800">{platformEmoji(active.platform)} {platformLabel(active.platform, ar)}</span>
                  {active.viewsCount > 0 && <span className="text-xs text-sky-300 inline-flex items-center gap-1"><Eye className="w-3.5 h-3.5" />{active.viewsCount} {ar ? "مشاهدة" : "views"}</span>}
                  <span className="text-xs text-pink-300 inline-flex items-center gap-1"><Heart className="w-3.5 h-3.5" />{active.likesCount || 0} {ar ? "إعجاب" : "likes"}</span>
                  <span className="text-xs text-indigo-300 inline-flex items-center gap-1"><MessageCircle className="w-3.5 h-3.5" />{active.commentsCount || 0} {ar ? "تعليق" : "comments"}</span>
                  {active.platform === "facebook" && <span className="text-xs text-slate-300 inline-flex items-center gap-1"><Share2 className="w-3.5 h-3.5" />{active.sharesCount || 0} {ar ? "مشاركة" : "shares"}</span>}
                  {active.permalink && <a href={active.permalink} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 text-xs inline-flex items-center gap-1 ms-auto">{ar ? "فتح المنشور" : "Open post"} <ExternalLink className="w-3 h-3" /></a>}
                </div>
                <p className="text-sm text-slate-300 mb-4 line-clamp-3">{active.message}</p>

                {loadingComments ? (
                  <div className="py-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-indigo-400" /></div>
                ) : commentsError ? (
                  <div className="bg-amber-900/30 border border-amber-500/30 rounded-lg p-3 text-[12px] text-amber-200 leading-relaxed">
                    {ar ? "تعذّر تحميل التعليقات. غالباً تحتاج تفعيل صلاحية التفاعل من Meta وإعادة الربط." : "Couldn't load comments — engagement permission may be needed."}
                    <div className="text-amber-300/70 mt-1 text-[10px]" dir="ltr">{commentsError}</div>
                  </div>
                ) : comments.length === 0 ? (
                  <div className="text-slate-500 text-sm py-8 text-center">{ar ? "لا توجد تعليقات على هذا المنشور." : "No comments on this post."}</div>
                ) : (
                  <div className="space-y-3">
                    {comments.map((c) => (
                      <div key={c.id} className="bg-slate-900 border border-slate-800 rounded-xl p-3">
                        <div className="flex items-center gap-2 text-[12px]"><span className="font-bold text-white">{c.from || "—"}</span><span className="text-slate-500 text-[10px]">{timeAgo(c.created, ar)}</span></div>
                        <p className="text-[13px] text-slate-200 mt-1" dir="auto">{c.text}</p>

                        {c.replies?.length > 0 && (
                          <div className="mt-2 ps-3 border-s-2 border-slate-700 space-y-1.5">
                            {c.replies.map((rp) => (
                              <div key={rp.id} className="text-[12px]"><span className="font-bold text-slate-300">{rp.from}</span> <span className="text-slate-400" dir="auto">{rp.text}</span></div>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center gap-2 mt-2">
                          <input value={replyText[c.id] || ""} onChange={(e) => setReplyText((p) => ({ ...p, [c.id]: e.target.value }))}
                            onKeyDown={(e) => { if (e.key === "Enter") sendReply(c); }}
                            placeholder={ar ? "اكتب رداً…" : "Write a reply…"}
                            className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-[12px] text-white outline-none focus:border-indigo-500" />
                          <button onClick={() => sendReply(c)} disabled={sending === c.id || !(replyText[c.id] || "").trim()}
                            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition disabled:opacity-50 inline-flex items-center gap-1">
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
