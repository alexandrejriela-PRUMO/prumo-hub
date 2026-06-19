content = """import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Bell, Mail, MessageCircle, Phone, Save, Clock, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { toast } from 'sonner';
"""
with open("src/components/notifications/NotificationPreferences.jsx", "w", encoding="utf-8") as f:
    f.write(content)
print("parte 1 ok")
