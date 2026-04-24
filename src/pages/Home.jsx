import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useEffectiveUser } from '../hooks/useEffectiveUser';
import HomeContent from './HomeContent';

// Wrapper que garante que useNavigate e useQueryClient são chamados dentro do contexto correto
export default function Home() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, effectiveEmail, isEquipe, isConsultor, isLoading } = useEffectiveUser();

  return (
    <HomeContent
      navigate={navigate}
      queryClient={queryClient}
      user={user}
      effectiveEmail={effectiveEmail}
      isEquipe={isEquipe}
      isConsultor={isConsultor}
      effectiveLoading={isLoading}
    />
  );
}