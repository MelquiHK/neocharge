import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Star,
  BadgeCheck,
  Loader2,
  Pencil,
  Trash2,
  MessageSquareHeart,
  PenLine,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  computeReviewStats,
  displayReviewerName,
  type ReviewRow,
  type ReviewerProfile,
} from "@/lib/reviews";

interface ReviewsProps {
  productId: string;
  productName?: string;
}

const EMPTY_FORM = { rating: 0, title: "", body: "" };

function Stars({ value, className = "w-4 h-4" }: { value: number; className?: string }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} de 5 estrellas`}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`${className} ${
            s <= Math.round(value)
              ? "fill-amber-400 text-amber-400"
              : "fill-slate-200 text-slate-300"
          }`}
          aria-hidden="true"
        />
      ))}
    </span>
  );
}

function StarInput({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="Tu calificación">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          disabled={disabled}
          onClick={() => onChange(s)}
          onMouseEnter={() => setHover(s)}
          onMouseLeave={() => setHover(0)}
          aria-label={`${s} estrella${s > 1 ? "s" : ""}`}
          aria-checked={value === s}
          role="radio"
          className="p-1 rounded-lg hover:scale-110 transition-transform disabled:opacity-50"
        >
          <Star
            className={`w-8 h-8 transition-colors ${
              s <= shown ? "fill-amber-400 text-amber-400" : "fill-slate-200 text-slate-300"
            }`}
          />
        </button>
      ))}
      <span className="ml-2 text-sm font-semibold text-muted-foreground">
        {value > 0 ? `${value}/5` : "Toca las estrellas"}
      </span>
    </div>
  );
}

/**
 * Sección de reseñas de un producto: promedio, distribución por estrellas,
 * lista pública y formulario (solo usuarios logueados).
 *
 * La tabla `reviews` vive en Supabase (migración 20261007140000_reviews.sql,
 * pendiente de aplicar en vivo). Si la tabla aún no existe, el componente
 * muestra el estado vacío sin romper la ficha del producto.
 */
export function Reviews({ productId, productName }: ReviewsProps) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [profiles, setProfiles] = useState<Map<string, ReviewerProfile>>(new Map());
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .eq("product_id", productId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const rows = (data ?? []) as ReviewRow[];
      setReviews(rows);

      const ids = [...new Set(rows.map((r) => r.user_id))];
      if (ids.length > 0) {
        const { data: profs, error: profError } = await supabase
          .from("profiles")
          .select("id, full_name, username")
          .in("id", ids);
        if (profError) throw profError;
        setProfiles(new Map((profs as ReviewerProfile[]).map((p) => [p.id, p])));
      } else {
        setProfiles(new Map());
      }
    } catch (err) {
      // La tabla puede no existir aún en la BD en vivo (migración pendiente):
      // no se rompe la ficha, solo queda el estado vacío.
      console.error("[reviews] no se pudieron cargar las reseñas:", err);
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    load();
  }, [load]);

  const stats = useMemo(() => computeReviewStats(reviews), [reviews]);
  const ownReview = useMemo(
    () => (user ? reviews.find((r) => r.user_id === user.id) ?? null : null),
    [reviews, user],
  );

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setFormOpen(false);
  };

  const startEdit = (review: ReviewRow) => {
    setForm({
      rating: review.rating,
      title: review.title ?? "",
      body: review.body ?? "",
    });
    setEditingId(review.id);
    setFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Inicia sesión para dejar tu reseña.");
      return;
    }
    if (form.rating < 1 || form.rating > 5) {
      toast.error("Elige de 1 a 5 estrellas.");
      return;
    }
    if (form.body.trim().length < 3) {
      toast.error("Cuéntanos un poco más en tu reseña.");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        rating: form.rating,
        title: form.title.trim() || null,
        body: form.body.trim(),
      };
      if (editingId) {
        const { error } = await supabase.from("reviews").update(payload).eq("id", editingId);
        if (error) throw error;
        toast.success("Reseña actualizada.");
      } else {
        const { error } = await supabase.from("reviews").insert({
          product_id: productId,
          user_id: user.id,
          ...payload,
        });
        if (error) {
          // 23505: UNIQUE(product_id, user_id) -> ya tiene reseña
          if ((error as { code?: string }).code === "23505") {
            toast.info("Ya dejaste una reseña para este producto; puedes editarla.");
            return;
          }
          throw error;
        }
        toast.success("¡Gracias por tu reseña!");
      }
      resetForm();
      await load();
    } catch (err) {
      console.error("[reviews] error guardando reseña:", err);
      toast.error("No pudimos guardar tu reseña. Inténtalo de nuevo.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (review: ReviewRow) => {
    if (!window.confirm("¿Eliminar tu reseña? Esta acción no se puede deshacer.")) return;
    setDeletingId(review.id);
    try {
      const { error } = await supabase.from("reviews").delete().eq("id", review.id);
      if (error) throw error;
      toast.success("Reseña eliminada.");
      await load();
    } catch (err) {
      console.error("[reviews] error eliminando reseña:", err);
      toast.error("No pudimos eliminar tu reseña. Inténtalo de nuevo.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section aria-label="Reseñas del producto" className="glass rounded-3xl p-6 hover-lift">
      <h2 className="font-display text-2xl font-bold mb-1">Opiniones de clientes</h2>
      <p className="text-sm text-muted-foreground mb-6">
        {productName
          ? `Lo que opinan quienes compraron "${productName}".`
          : "Lo que opinan quienes compraron este producto."}
      </p>

      {loading ? (
        <div className="space-y-3" aria-hidden>
          <div className="h-6 rounded-lg bg-muted animate-pulse w-1/3" />
          <div className="h-24 rounded-2xl bg-muted animate-pulse" />
          <div className="h-24 rounded-2xl bg-muted animate-pulse" />
        </div>
      ) : (
        <>
          {/* Resumen: promedio + distribución */}
          <div className="grid sm:grid-cols-[auto_1fr] gap-6 items-center mb-8">
            <div className="text-center sm:text-left">
              <p className="font-display text-5xl font-extrabold text-gradient">
                {stats.count > 0 ? stats.average.toFixed(1) : "—"}
              </p>
              <div className="mt-1 flex justify-center sm:justify-start">
                <Stars value={stats.average} className="w-5 h-5" />
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {stats.count === 0
                  ? "Sin reseñas todavía"
                  : `${stats.count} reseña${stats.count > 1 ? "s" : ""}`}
              </p>
            </div>
            <div className="space-y-1.5">
              {stats.distribution.map((b) => (
                <div key={b.stars} className="flex items-center gap-2 text-sm">
                  <span className="w-8 shrink-0 font-semibold text-muted-foreground">
                    {b.stars}★
                  </span>
                  <div
                    className="flex-1 h-2.5 rounded-full bg-slate-200/70 overflow-hidden"
                    role="img"
                    aria-label={`${b.count} reseñas de ${b.stars} estrellas`}
                  >
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-brand-500 to-grape-500 transition-all"
                      style={{ width: `${b.pct}%` }}
                    />
                  </div>
                  <span className="w-8 shrink-0 text-right text-muted-foreground">{b.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Lista de reseñas */}
          {reviews.length === 0 ? (
            <div className="text-center py-8 px-4 rounded-2xl border border-dashed border-brand-300/60 bg-white/40">
              <MessageSquareHeart className="w-10 h-10 mx-auto mb-3 text-brand-400" />
              <p className="font-semibold text-lg">Aún no hay reseñas</p>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                {user
                  ? "Sé el primero en contar tu experiencia con este producto."
                  : "Inicia sesión y sé el primero en contar tu experiencia."}
              </p>
              {user && (
                <Button onClick={() => setFormOpen(true)} className="rounded-2xl nc-btn-shine">
                  <PenLine className="w-4 h-4 mr-2" /> Escribir la primera reseña
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4 mb-2">
              {reviews.map((review) => {
                const isOwn = user?.id === review.user_id;
                return (
                  <article
                    key={review.id}
                    className="glass rounded-2xl p-5 border-brand-200/60"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="min-w-0">
                        <p className="font-semibold truncate">
                          {displayReviewerName(profiles.get(review.user_id))}
                          {isOwn && (
                            <span className="ml-2 text-xs font-normal text-muted-foreground">
                              (tu reseña)
                            </span>
                          )}
                        </p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Stars value={review.rating} />
                          {review.verified && (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/70 rounded-full px-2.5 py-0.5">
                              <BadgeCheck className="w-3.5 h-3.5" />
                              Compra verificada
                            </span>
                          )}
                        </div>
                      </div>
                      <time
                        className="text-xs text-muted-foreground shrink-0"
                        dateTime={review.created_at}
                      >
                        {format(new Date(review.created_at), "d 'de' MMMM 'de' yyyy", {
                          locale: es,
                        })}
                      </time>
                    </div>
                    {review.title && (
                      <h3 className="font-semibold mb-1">{review.title}</h3>
                    )}
                    {review.body && (
                      <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                        {review.body}
                      </p>
                    )}
                    {isOwn && (
                      <div className="flex gap-2 mt-3 pt-3 border-t border-slate-200/60">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => startEdit(review)}
                          className="rounded-xl"
                        >
                          <Pencil className="w-3.5 h-3.5 mr-1.5" /> Editar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(review)}
                          disabled={deletingId === review.id}
                          className="rounded-xl text-destructive hover:text-destructive"
                        >
                          {deletingId === review.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                          )}
                          Eliminar
                        </Button>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}

          {/* Formulario: solo logueados, una reseña por producto */}
          {user && !formOpen && reviews.length > 0 && !ownReview && (
            <Button onClick={() => setFormOpen(true)} className="rounded-2xl nc-btn-shine mt-4">
              <PenLine className="w-4 h-4 mr-2" /> Escribir una reseña
            </Button>
          )}

          {user && formOpen && (
            <form
              onSubmit={handleSubmit}
              className="mt-6 rounded-2xl border border-brand-300/60 bg-white/50 backdrop-blur p-5 space-y-4"
            >
              <h3 className="font-display font-bold text-lg">
                {editingId ? "Edita tu reseña" : "Tu reseña"}
              </h3>
              <div>
                <span className="nc-label">Calificación</span>
                <StarInput
                  value={form.rating}
                  onChange={(v) => setForm((f) => ({ ...f, rating: v }))}
                  disabled={submitting}
                />
              </div>
              <div>
                <label htmlFor="review-title" className="nc-label">
                  Título <span className="font-normal text-muted-foreground">(opcional)</span>
                </label>
                <input
                  id="review-title"
                  type="text"
                  maxLength={120}
                  placeholder="Resúmelo en una línea"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  disabled={submitting}
                  className="nc-input"
                />
              </div>
              <div>
                <label htmlFor="review-body" className="nc-label">
                  Tu opinión
                </label>
                <Textarea
                  id="review-body"
                  rows={4}
                  maxLength={2000}
                  placeholder="¿Qué te pareció el producto? ¿Cómo te ha funcionado?"
                  value={form.body}
                  onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                  disabled={submitting}
                  className="nc-input resize-y min-h-24"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button
                  type="submit"
                  disabled={submitting}
                  className="rounded-2xl nc-btn-shine"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : null}
                  {editingId ? "Guardar cambios" : "Publicar reseña"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetForm}
                  disabled={submitting}
                  className="rounded-2xl"
                >
                  Cancelar
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Si compraste este producto en NeoCharge, tu reseña saldrá marcada
                como «Compra verificada».
              </p>
            </form>
          )}

          {!user && (
            <p className="text-sm text-muted-foreground mt-6 text-center">
              Inicia sesión para dejar tu reseña sobre este producto.
            </p>
          )}
        </>
      )}
    </section>
  );
}
