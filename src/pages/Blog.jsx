import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Newspaper, FileText, Calendar, User, Tag } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Blog() {
  const [activeTab, setActiveTab] = useState('Notícia');
  const [selectedPost, setSelectedPost] = useState(null);

  const { data: posts, isLoading } = useQuery({
    queryKey: ['blogPosts'],
    queryFn: () => base44.entities.BlogPost.list('-published_date'),
    initialData: []
  });

  const filteredPosts = posts.filter(post => post.type === activeTab);

  if (selectedPost) {
    return (
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => setSelectedPost(null)}
          className="mb-6 text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-2"
        >
          ← Voltar
        </button>

        <Card className="border-emerald-100 overflow-hidden">
          {selectedPost.image_url && (
            <div className="w-full h-80 bg-emerald-100">
              <img
                src={selectedPost.image_url}
                alt={selectedPost.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <CardContent className="p-8">
            <Badge className="mb-4 bg-emerald-100 text-emerald-700 border-emerald-200">
              {selectedPost.type}
            </Badge>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              {selectedPost.title}
            </h1>
            
            <div className="flex items-center gap-4 text-sm text-gray-600 mb-6 pb-6 border-b border-gray-200">
              {selectedPost.author && (
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  {selectedPost.author}
                </div>
              )}
              {selectedPost.published_date && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {format(parseISO(selectedPost.published_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </div>
              )}
            </div>

            {selectedPost.summary && (
              <div className="bg-emerald-50 border-l-4 border-emerald-600 p-4 mb-6">
                <p className="text-gray-700 font-medium">{selectedPost.summary}</p>
              </div>
            )}

            <div className="prose prose-lg max-w-none text-gray-800 whitespace-pre-wrap">
              {selectedPost.content}
            </div>

            {selectedPost.tags && selectedPost.tags.length > 0 && (
              <div className="mt-8 pt-6 border-t border-gray-200">
                <div className="flex items-center gap-2 flex-wrap">
                  <Tag className="w-4 h-4 text-gray-500" />
                  {selectedPost.tags.map((tag, idx) => (
                    <Badge key={idx} variant="outline" className="bg-gray-50">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Newspaper className="w-8 h-8 text-emerald-600" />
          Santa Blog - Notícias e Soluções
        </h1>
        <p className="text-gray-600 mt-1">
          Mantenha-se atualizado sobre o mundo rural e ambiental
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
          <TabsTrigger value="Notícia" className="flex items-center gap-2">
            <Newspaper className="w-4 h-4" />
            Notícias ({posts.filter(p => p.type === 'Notícia').length})
          </TabsTrigger>
          <TabsTrigger value="Artigo" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Artigos ({posts.filter(p => p.type === 'Artigo').length})
          </TabsTrigger>
        </TabsList>

        {['Notícia', 'Artigo'].map((type) => (
          <TabsContent key={type} value={type}>
            {isLoading ? (
              <p className="text-center text-gray-500 py-12">Carregando...</p>
            ) : filteredPosts.length === 0 ? (
              <Card className="border-emerald-100">
                <CardContent className="text-center py-12">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-600">
                    Nenhum {type.toLowerCase()} disponível no momento
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredPosts.map((post) => (
                  <Card
                    key={post.id}
                    className="border-emerald-100 hover:shadow-xl transition-all cursor-pointer hover:border-emerald-300 overflow-hidden group"
                    onClick={() => setSelectedPost(post)}
                  >
                    {post.image_url && (
                      <div className="w-full h-48 bg-emerald-100 overflow-hidden">
                        <img
                          src={post.image_url}
                          alt={post.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                      </div>
                    )}
                    <CardContent className="p-5">
                      <Badge className="mb-3 bg-emerald-100 text-emerald-700 border-emerald-200">
                        {post.type}
                      </Badge>
                      <h3 className="font-bold text-lg text-gray-900 mb-2 group-hover:text-emerald-700 transition-colors line-clamp-2">
                        {post.title}
                      </h3>
                      {post.summary && (
                        <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                          {post.summary}
                        </p>
                      )}
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        {post.published_date && (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {format(parseISO(post.published_date), "dd/MM/yyyy")}
                          </div>
                        )}
                        {post.author && (
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {post.author}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}