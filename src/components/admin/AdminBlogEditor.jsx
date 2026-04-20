import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Newspaper, Plus, Pencil, Trash2, RefreshCw, X, Calendar, User, Tag, Upload } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';

const EMPTY_POST = {
  title: '',
  type: 'Notícia',
  author: '',
  summary: '',
  content: '',
  image_url: '',
  tags: [],
  published_date: new Date().toISOString().split('T')[0],
  is_published: true,
};

function PostForm({ post, onSave, onCancel }) {
  const [form, setForm] = useState(post || EMPTY_POST);
  const [tagInput, setTagInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !form.tags.includes(t)) {
      setForm(f => ({ ...f, tags: [...f.tags, t] }));
    }
    setTagInput('');
  };

  const removeTag = (t) => setForm(f => ({ ...f, tags: f.tags.filter(x => x !== t) }));

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm(f => ({ ...f, image_url: file_url }));
      toast.success('Imagem enviada!');
    } catch {
      toast.error('Erro ao enviar imagem.');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!form.title) { toast.error('Informe o título.'); return; }
    setSaving(true);
    try {
      if (form.id) {
        await base44.entities.BlogPost.update(form.id, form);
      } else {
        await base44.entities.BlogPost.create(form);
      }
      toast.success(form.id ? 'Post atualizado!' : 'Post publicado!');
      onSave();
    } catch {
      toast.error('Erro ao salvar post.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-emerald-200 shadow-md">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-base">
          {form.id ? 'Editar Post' : 'Novo Post'}
        </CardTitle>
        <button onClick={onCancel} className="p-1 rounded-lg hover:bg-gray-100">
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Título *</Label>
            <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Título do post" />
          </div>
          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Notícia">Notícia</SelectItem>
                <SelectItem value="Artigo">Artigo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Autor</Label>
            <Input value={form.author} onChange={e => setForm(f => ({ ...f, author: e.target.value }))} placeholder="Nome do autor" />
          </div>
          <div className="space-y-1.5">
            <Label>Data de publicação</Label>
            <Input type="date" value={form.published_date} onChange={e => setForm(f => ({ ...f, published_date: e.target.value }))} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Resumo (subtítulo)</Label>
          <Input value={form.summary} onChange={e => setForm(f => ({ ...f, summary: e.target.value }))} placeholder="Breve descrição do post" />
        </div>

        <div className="space-y-1.5">
          <Label>Conteúdo completo</Label>
          <Textarea
            value={form.content}
            onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
            placeholder="Escreva o conteúdo completo do post..."
            rows={8}
          />
        </div>

        {/* Image */}
        <div className="space-y-1.5">
          <Label>Imagem de capa</Label>
          <div className="flex gap-2 items-center">
            <Input
              value={form.image_url}
              onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))}
              placeholder="URL da imagem ou faça upload"
              className="flex-1"
            />
            <label className="cursor-pointer">
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              <Button type="button" variant="outline" size="sm" disabled={uploading}>
                <Upload className="w-4 h-4 mr-1" />
                {uploading ? '...' : 'Upload'}
              </Button>
            </label>
          </div>
          {form.image_url && (
            <img src={form.image_url} alt="capa" className="w-full h-32 object-cover rounded-lg mt-2" />
          )}
        </div>

        {/* Tags */}
        <div className="space-y-1.5">
          <Label>Tags</Label>
          <div className="flex gap-2">
            <Input
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              placeholder="Adicionar tag"
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
            />
            <Button type="button" variant="outline" size="sm" onClick={addTag}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          {form.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-1">
              {form.tags.map((t, i) => (
                <Badge key={i} variant="outline" className="flex items-center gap-1">
                  {t}
                  <button onClick={() => removeTag(t)} className="ml-0.5 hover:text-red-500">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
            {saving ? 'Salvando...' : (form.id ? 'Atualizar Post' : 'Publicar Post')}
          </Button>
          <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminBlogEditor() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(null); // null = closed, {} = new, post = edit
  const [filterType, setFilterType] = useState('all');

  const { data: posts = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-blog-posts'],
    queryFn: () => base44.entities.BlogPost.list('-published_date', 100),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.BlogPost.delete(id),
    onSuccess: () => { toast.success('Post excluído.'); refetch(); },
    onError: () => toast.error('Erro ao excluir post.'),
  });

  const filtered = filterType === 'all' ? posts : posts.filter(p => p.type === filterType);

  if (editing !== null) {
    return (
      <PostForm
        post={editing && editing.id ? editing : null}
        onSave={() => { setEditing(null); refetch(); }}
        onCancel={() => setEditing(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-2">
          {['all', 'Notícia', 'Artigo'].map(t => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filterType === t ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              {t === 'all' ? 'Todos' : t + 's'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => refetch()} className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50">
            <RefreshCw className="w-4 h-4 text-gray-500" />
          </button>
          <Button onClick={() => setEditing({})} className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="w-4 h-4 mr-2" /> Novo Post
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <div className="w-6 h-6 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-gray-100">
          <CardContent className="text-center py-12">
            <Newspaper className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">Nenhum post publicado ainda.</p>
            <Button onClick={() => setEditing({})} className="mt-4 bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4 mr-2" /> Criar Primeiro Post
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(post => (
            <Card key={post.id} className="border-gray-200 hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {post.image_url && (
                    <img src={post.image_url} alt={post.title} className="w-20 h-16 object-cover rounded-lg flex-shrink-0 hidden sm:block" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Badge className="bg-emerald-100 text-emerald-700 border-0">{post.type}</Badge>
                          {post.tags?.slice(0, 2).map((t, i) => (
                            <Badge key={i} variant="outline" className="text-xs">{t}</Badge>
                          ))}
                        </div>
                        <h4 className="font-semibold text-gray-900 truncate">{post.title}</h4>
                        {post.summary && <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{post.summary}</p>}
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                          {post.author && <span className="flex items-center gap-1"><User className="w-3 h-3" />{post.author}</span>}
                          {post.published_date && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {format(parseISO(post.published_date), 'dd/MM/yyyy')}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={() => setEditing(post)}
                          className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => { if (confirm('Excluir este post?')) deleteMutation.mutate(post.id); }}
                          className="p-1.5 rounded-lg text-red-500 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}