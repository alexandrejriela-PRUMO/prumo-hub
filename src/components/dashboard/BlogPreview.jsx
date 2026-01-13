import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Newspaper, FileText, Calendar, ArrowRight, ChevronRight } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function BlogPreview() {
  const [activeTab, setActiveTab] = useState('Notícia');

  const { data: posts, isLoading } = useQuery({
    queryKey: ['blogPosts'],
    queryFn: () => base44.entities.BlogPost.list('-published_date', 6),
    initialData: []
  });

  const filteredPosts = posts.filter(post => post.type === activeTab).slice(0, 3);

  const PostCard = ({ post }) => (
    <Link to={createPageUrl('Blog')} className="block group">
      <Card className="border-emerald-100 hover:shadow-lg transition-all hover:border-emerald-300">
        <CardContent className="p-4">
          <div className="flex gap-4">
            {post.image_url && (
              <div className="w-24 h-24 rounded-lg bg-emerald-100 flex-shrink-0 overflow-hidden">
                <img 
                  src={post.image_url} 
                  alt={post.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-emerald-700 transition-colors line-clamp-2">
                {post.title}
              </h3>
              <p className="text-sm text-gray-600 line-clamp-2 mb-2">{post.summary}</p>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                {post.published_date && (
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {format(parseISO(post.published_date), "dd/MM/yyyy")}
                  </div>
                )}
                {post.author && <span>• {post.author}</span>}
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-emerald-600 transition-colors flex-shrink-0" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );

  return (
    <Card className="border-emerald-100 overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-emerald-50 to-emerald-100">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-gray-900">
            <Newspaper className="w-6 h-6 text-emerald-700" />
            Santa Blog - Notícias e Soluções
          </CardTitle>
          <Link to={createPageUrl('Blog')}>
            <Button variant="outline" size="sm" className="border-emerald-300 text-emerald-700 hover:bg-emerald-50">
              Ver todos <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="Notícia" className="flex items-center gap-2">
              <Newspaper className="w-4 h-4" />
              Notícias
            </TabsTrigger>
            <TabsTrigger value="Artigo" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Artigos
            </TabsTrigger>
          </TabsList>

          {['Notícia', 'Artigo'].map((type) => (
            <TabsContent key={type} value={type} className="space-y-3">
              {isLoading ? (
                <p className="text-center text-gray-500 py-8">Carregando...</p>
              ) : filteredPosts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-40" />
                  <p>Nenhum {type.toLowerCase()} disponível no momento</p>
                </div>
              ) : (
                filteredPosts.map(post => <PostCard key={post.id} post={post} />)
              )}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}