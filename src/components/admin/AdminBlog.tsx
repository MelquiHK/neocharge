import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Image as ImageIcon, ExternalLink } from "lucide-react";
import { renderMarkdown } from "@/lib/markdown";

type BlogCategory = {
  id: string;
  name: string;
  slug: string;
  created_at?: string;
};

type BlogPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  image_url: string | null;
  images?: string[] | null;
  category_id: string | null;
  author_id: string | null;
  is_published: boolean;
  created_at?: string;
  updated_at?: string;
};

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const BLOG_IMAGE_BUCKET = "product-images";
const NONE_CATEGORY_VALUE = "__none__";


export function AdminBlog() {
  const [tab, setTab] = useState<"posts" | "categories">("posts");

  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  // Categories dialog
  const [catOpen, setCatOpen] = useState(false);
  const [catEditing, setCatEditing] = useState<Partial<BlogCategory> | null>(null);

  // Posts dialog
  const [postOpen, setPostOpen] = useState(false);
  const [postEditing, setPostEditing] = useState<Partial<BlogPost> | null>(null);
  const [uploading, setUploading] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const contentRef = useRef<HTMLTextAreaElement | null>(null);

  const insertMarkdown = (template: string, placeholder = "texto") => {
    const textarea = contentRef.current;
    if (!textarea || !postEditing) return;
    const current = postEditing.content ?? "";
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = current.slice(start, end) || placeholder;
    const formatted = template.replace(/\{\{text\}\}/g, selected);
    const nextContent = `${current.slice(0, start)}${formatted}${current.slice(end)}`;
    setPostEditing((prev) => ({ ...(prev ?? {}), content: nextContent }));
    window.requestAnimationFrame(() => {
      textarea.focus();
      const cursor = start + formatted.indexOf(selected) + selected.length;
      textarea.setSelectionRange(cursor, cursor);
    });
  };

  const insertLinkMarkdown = () => {
    insertMarkdown("[{{text}}](https://)", "texto del enlace");
  };

  const insertImageMarkdown = () => {
    insertMarkdown("![{{text}}](https://)", "texto alternativo");
  };

  const insertUploadedImage = (src: string) => {
    if (!postEditing) return;
    const current = postEditing.content ?? "";
    const nextContent = `${current}${current.endsWith("\n") || current === "" ? "" : "\n"}![Imagen](${src})\n`;
    setPostEditing((prev) => ({ ...(prev ?? {}), content: nextContent }));
  };

  const categoryOptions = useMemo(() => {
    const opts = [...categories].sort((a, b) => a.name.localeCompare(b.name));
    return opts;
  }, [categories]);

  const load = async () => {
    setLoading(true);
    const [{ data: c, error: cErr }, { data: p, error: pErr }] = await Promise.all([
      supabase.from("blog_categories").select("id,name,slug,created_at").order("name"),
      supabase
        .from("blog_posts")
        .select("id,title,slug,excerpt,content,image_url,images,category_id,author_id,is_published,created_at,updated_at")
        .order("created_at", { ascending: false }),
    ]);
    if (cErr) toast.error(cErr.message);
    if (pErr) toast.error(pErr.message);
    setCategories((c ?? []) as BlogCategory[]);
    setPosts((p ?? []) as BlogPost[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const openNewCategory = () => {
    setCatEditing({ name: "", slug: "" });
    setCatOpen(true);
  };

  const openEditCategory = (c: BlogCategory) => {
    setCatEditing({ ...c });
    setCatOpen(true);
  };

  const saveCategory = async () => {
    if (!catEditing?.name?.trim()) {
      toast.error("Nombre obligatorio");
      return;
    }
    const slug = catEditing.slug?.trim() || slugify(catEditing.name);
    const payload = { name: catEditing.name.trim(), slug };

    if (catEditing.id) {
      const { error } = await supabase.from("blog_categories").update(payload).eq("id", catEditing.id);
      if (error) return toast.error(error.message);
      toast.success("Categoría actualizada");
    } else {
      const { error } = await supabase.from("blog_categories").insert(payload);
      if (error) return toast.error(error.message);
      toast.success("Categoría creada");
    }
    setCatOpen(false);
    setCatEditing(null);
    load();
  };

  const deleteCategory = async (id: string) => {
    const { error } = await supabase.from("blog_categories").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Categoría eliminada");
    load();
  };

  const openNewPost = () => {
    setPostEditing({
      title: "",
      slug: "",
      excerpt: "",
      content: "",
      image_url: null,
      images: [],
      category_id: null,
      is_published: false,
    });
    setPostOpen(true);
  };

  const openEditPost = (p: BlogPost) => {
    setPostEditing({ ...p });
    setPostOpen(true);
  };

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `blog/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from(BLOG_IMAGE_BUCKET).upload(path, file, { upsert: true });
    if (error) {
      toast.error("Error al subir imagen: " + error.message);
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from(BLOG_IMAGE_BUCKET).getPublicUrl(path);
    setPostEditing((prev) => {
      if (!prev) return prev;
      const imgs = Array.isArray(prev.images) ? prev.images : [];
      const next = [...imgs, data.publicUrl];
      return {
        ...prev,
        images: next,
        image_url: prev.image_url ?? next[0] ?? null, // cover/backcompat
      };
    });
    setUploading(false);
    toast.success("Imagen subida");
  };

  const removeImage = (src: string) => {
    setPostEditing((prev) => {
      if (!prev) return prev;
      const imgs = Array.isArray(prev.images) ? prev.images : [];
      const next = imgs.filter((x) => x !== src);
      const cover = prev.image_url === src ? (next[0] ?? null) : prev.image_url ?? (next[0] ?? null);
      return { ...prev, images: next, image_url: cover };
    });
  };

  const savePost = async () => {
    if (!postEditing?.title?.trim()) {
      toast.error("Título obligatorio");
      return;
    }
    const slug = postEditing.slug?.trim() || slugify(postEditing.title);
    const payload = {
      title: postEditing.title.trim(),
      slug,
      excerpt: postEditing.excerpt?.trim() || null,
      content: postEditing.content?.trim() || null,
      image_url: postEditing.image_url || null,
      images: Array.isArray(postEditing.images) ? postEditing.images : [],
      category_id: postEditing.category_id || null,
      is_published: !!postEditing.is_published,
    };

    if (postEditing.id) {
      const { error } = await supabase.from("blog_posts").update(payload as any).eq("id", postEditing.id);
      if (error) return toast.error(error.message);
      toast.success("Artículo actualizado");
    } else {
      const { error } = await supabase.from("blog_posts").insert(payload as any);
      if (error) return toast.error(error.message);
      toast.success("Artículo creado");
    }
    setPostOpen(false);
    setPostEditing(null);
    load();
  };

  const deletePost = async (id: string) => {
    const { error } = await supabase.from("blog_posts").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Artículo eliminado");
    load();
  };

  const publishedLabel = (p: BlogPost) => (p.is_published ? "Publicado" : "Borrador");

  if (loading) return <div className="text-center py-16 text-muted-foreground">Cargando blog…</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold">Blog</h2>
          <p className="text-sm text-muted-foreground">Gestiona categorías y artículos.</p>
        </div>
        {tab === "posts" ? (
          <Button variant="hero" onClick={openNewPost}>
            <Plus className="w-4 h-4" /> Nuevo artículo
          </Button>
        ) : (
          <Button variant="hero" onClick={openNewCategory}>
            <Plus className="w-4 h-4" /> Nueva categoría
          </Button>
        )}
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList className="bg-muted p-1 rounded-2xl">
          <TabsTrigger value="posts" className="rounded-xl">Artículos</TabsTrigger>
          <TabsTrigger value="categories" className="rounded-xl">Categorías</TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="mt-6">
          <div className="card-elevated p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr className="text-left text-xs uppercase text-muted-foreground">
                    <th className="py-3 px-4">Artículo</th>
                    <th className="py-3 px-4">Estado</th>
                    <th className="py-3 px-4">Categoría</th>
                    <th className="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {posts.map((p) => {
                    const cat = categories.find((c) => c.id === p.category_id);
                    return (
                      <tr key={p.id} className="border-t border-border">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-lg bg-secondary overflow-hidden shrink-0 flex items-center justify-center">
                              {p.image_url ? (
                                <img src={p.image_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <ImageIcon className="w-5 h-5 text-muted-foreground" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold truncate">{p.title}</p>
                              <p className="text-xs text-muted-foreground truncate">{p.slug}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={p.is_published ? "text-success font-semibold" : "text-muted-foreground"}>
                            {publishedLabel(p)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">{cat?.name ?? "—"}</td>
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex gap-1">
                            {p.slug && (
                              <Button size="icon" variant="ghost" asChild>
                                <a href={`/blog`} target="_blank" rel="noreferrer" title="Ver blog">
                                  <ExternalLink className="w-4 h-4" />
                                </a>
                              </Button>
                            )}
                            <Button size="icon" variant="ghost" onClick={() => openEditPost(p)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="icon" variant="ghost" className="text-destructive">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>¿Eliminar artículo?</AlertDialogTitle>
                                  <AlertDialogDescription>Esto borrará “{p.title}” definitivamente.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deletePost(p.id)} className="bg-destructive">
                                    Eliminar
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {posts.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-10 text-center text-muted-foreground">
                        No hay artículos todavía. Crea el primero con “Nuevo artículo”.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="categories" className="mt-6">
          <div className="card-elevated p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr className="text-left text-xs uppercase text-muted-foreground">
                    <th className="py-3 px-4">Nombre</th>
                    <th className="py-3 px-4">Slug</th>
                    <th className="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((c) => (
                    <tr key={c.id} className="border-t border-border">
                      <td className="py-3 px-4 font-semibold">{c.name}</td>
                      <td className="py-3 px-4 text-muted-foreground">{c.slug}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex gap-1">
                          <Button size="icon" variant="ghost" onClick={() => openEditCategory(c)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="icon" variant="ghost" className="text-destructive">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Eliminar categoría?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esto eliminará “{c.name}”. Si hay posts asociados, podría fallar por llaves foráneas.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteCategory(c.id)} className="bg-destructive">
                                  Eliminar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {categories.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-10 text-center text-muted-foreground">
                        No hay categorías todavía. Crea “Novedades”, “Ayudas”, etc.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Category dialog */}
      <Dialog open={catOpen} onOpenChange={setCatOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{catEditing?.id ? "Editar categoría" : "Nueva categoría"}</DialogTitle>
            <DialogDescription>Ejemplo: Novedades, Ayudas, Guías…</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input
                value={catEditing?.name ?? ""}
                onChange={(e) => setCatEditing((p) => ({ ...(p ?? {}), name: e.target.value }))}
                placeholder="Novedades"
              />
            </div>
            <div className="space-y-2">
              <Label>Slug (opcional)</Label>
              <Input
                value={catEditing?.slug ?? ""}
                onChange={(e) => setCatEditing((p) => ({ ...(p ?? {}), slug: e.target.value }))}
                placeholder="novedades"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCatOpen(false)}>Cancelar</Button>
            <Button onClick={saveCategory}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Post dialog */}
      <Dialog open={postOpen} onOpenChange={setPostOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{postEditing?.id ? "Editar artículo" : "Nuevo artículo"}</DialogTitle>
            <DialogDescription>Publica novedades, guías y artículos para tus clientes.</DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Título</Label>
                <Input
                  value={postEditing?.title ?? ""}
                  onChange={(e) => setPostEditing((p) => ({ ...(p ?? {}), title: e.target.value }))}
                  placeholder="Cómo elegir un cargador USB‑C"
                />
              </div>
              <div className="space-y-2">
                <Label>Slug (opcional)</Label>
                <Input
                  value={postEditing?.slug ?? ""}
                  onChange={(e) => setPostEditing((p) => ({ ...(p ?? {}), slug: e.target.value }))}
                  placeholder="como-elegir-un-cargador-usbc"
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 items-end">
              <div className="space-y-2">
                <Label>Categoría</Label>
                <Select
                  value={postEditing?.category_id ?? NONE_CATEGORY_VALUE}
                  onValueChange={(v) =>
                    setPostEditing((p) => ({
                      ...(p ?? {}),
                      category_id: v === NONE_CATEGORY_VALUE ? null : v,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE_CATEGORY_VALUE}>Sin categoría</SelectItem>
                    {categoryOptions.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-border p-4">
                <div className="space-y-0.5">
                  <p className="font-semibold">Publicado</p>
                  <p className="text-xs text-muted-foreground">Si está apagado, no se muestra en el blog.</p>
                </div>
                <Switch
                  checked={!!postEditing?.is_published}
                  onCheckedChange={(v) => setPostEditing((p) => ({ ...(p ?? {}), is_published: v }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Extracto</Label>
              <Textarea
                value={postEditing?.excerpt ?? ""}
                onChange={(e) => setPostEditing((p) => ({ ...(p ?? {}), excerpt: e.target.value }))}
                placeholder="Resumen corto para la tarjeta del blog…"
                className="min-h-[80px]"
              />
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <Label>Contenido</Label>
                  <p className="text-xs text-muted-foreground">Puedes usar markdown básico para negritas, enlaces, listas e imágenes.</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant={previewMode ? "outline" : "secondary"} onClick={() => setPreviewMode(false)}>
                    Editar
                  </Button>
                  <Button size="sm" variant={previewMode ? "secondary" : "outline"} onClick={() => setPreviewMode(true)}>
                    Vista previa
                  </Button>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => insertMarkdown("**{{text}}**", "negrita")}>
                    Negrita
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => insertMarkdown("*{{text}}*", "cursiva")}>
                    Cursiva
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => insertMarkdown("- {{text}}\n", "Lista")}>
                    Lista
                  </Button>
                  <Button size="sm" variant="outline" onClick={insertLinkMarkdown}>
                    Enlace
                  </Button>
                  <Button size="sm" variant="outline" onClick={insertImageMarkdown}>
                    Imagen
                  </Button>
                </div>
                {Array.isArray(postEditing?.images) && postEditing.images.length > 0 && (
                  <div className="flex flex-wrap gap-2 rounded-2xl border border-border bg-muted/40 p-3 text-sm">
                    <span className="text-muted-foreground">Imágenes subidas:</span>
                    {postEditing.images.map((src) => (
                      <Button key={src} size="sm" variant="secondary" onClick={() => insertUploadedImage(src)}>
                        Insertar imagen
                      </Button>
                    ))}
                  </div>
                )}
              {previewMode ? (
                <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                  <div
                    className="prose prose-sm prose-slate dark:prose-invert"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(postEditing?.content ?? "") }}
                  />
                </div>
              ) : (
                <Textarea
                  ref={contentRef}
                  value={postEditing?.content ?? ""}
                  onChange={(e) => setPostEditing((p) => ({ ...(p ?? {}), content: e.target.value }))}
                  placeholder="Contenido del artículo (puedes usar Markdown si quieres)…"
                  className="min-h-[220px]"
                />
              )}
            </div>

            <div className="space-y-3">
              <Label>Imagen</Label>
              {((postEditing?.image_url && postEditing.image_url) || (Array.isArray(postEditing?.images) && postEditing!.images!.length > 0)) ? (
                <div className="rounded-2xl border border-border overflow-hidden">
                  {postEditing?.image_url && (
                    <img src={postEditing.image_url} alt="" className="w-full max-h-[260px] object-cover" />
                  )}
                  <div className="p-4 space-y-3">
                    {Array.isArray(postEditing?.images) && postEditing.images.length > 0 && (
                      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                        {postEditing.images.map((src) => (
                          <button
                            key={src}
                            type="button"
                            className="aspect-square rounded-xl overflow-hidden bg-secondary border border-border hover:border-primary/50 transition-colors"
                            onClick={() => removeImage(src)}
                            title="Click para quitar"
                          >
                            <img src={src} alt="" className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2 justify-end">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        multiple
                        disabled={uploading}
                        onChange={(e) => {
                          const files = Array.from(e.target.files ?? []);
                          if (files.length > 0) {
                            // sequential upload (simpler)
                            (async () => {
                              for (const f of files) {
                                // eslint-disable-next-line no-await-in-loop
                                await handleImageUpload(f);
                              }
                            })();
                          }
                          e.currentTarget.value = "";
                        }}
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={uploading}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <ImageIcon className="w-4 h-4" /> {uploading ? "Subiendo…" : "Agregar imágenes"}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setPostEditing((p) => (p ? { ...p, image_url: null, images: [] } : p))}
                      >
                        Quitar todas
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-border p-6 flex items-center justify-between gap-3">
                  <div className="text-sm">
                    <p className="font-semibold">Subir imagen</p>
                    <p className="text-muted-foreground text-xs">
                      Se sube a Storage en el bucket <span className="font-mono">{BLOG_IMAGE_BUCKET}</span>.
                    </p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    multiple
                    disabled={uploading}
                    onChange={(e) => {
                      const files = Array.from(e.target.files ?? []);
                      if (files.length > 0) {
                        (async () => {
                          for (const f of files) {
                            // eslint-disable-next-line no-await-in-loop
                            await handleImageUpload(f);
                          }
                        })();
                      }
                      e.currentTarget.value = "";
                    }}
                  />
                  <Button type="button" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
                    <ImageIcon className="w-4 h-4" /> {uploading ? "Subiendo…" : "Elegir imágenes"}
                  </Button>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setPostOpen(false)}>Cancelar</Button>
            <Button onClick={savePost}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

