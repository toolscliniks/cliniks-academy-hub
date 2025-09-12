import { z } from 'zod';

// Schema unificado para todas as comunicações com n8n
export const UnifiedPayloadSchema = z.object({
  type: z.enum(['user_signup', 'course_purchase', 'plan_purchase']),
  request_id: z.string().uuid(),
  timestamp: z.string().datetime(),
  user: z.object({
    id: z.string().uuid(),
    name: z.string().min(1),
    email: z.string().email(),
    cpf: z.string().length(11, 'CPF deve ter exatamente 11 dígitos'),
    phone: z.string().min(10).max(11, 'Telefone deve ter 10 ou 11 dígitos')
  }),
  item: z.object({
    kind: z.enum(['course', 'plan']),
    id: z.string(),
    name: z.string(),
    price_cents: z.number().int().positive(),
    currency: z.literal('BRL'),
    // Apenas para planos
    interval: z.enum(['monthly', 'annual']).optional(),
    included_courses: z.array(z.object({
      course_id: z.string(),
      title: z.string()
    })).optional()
  }),
  meta: z.object({
    source: z.literal('web'),
    user_agent: z.string().optional()
  })
});

export type UnifiedPayload = z.infer<typeof UnifiedPayloadSchema>;

// Exemplos de payloads válidos
export const ExamplePayloads = {
  user_signup: {
    type: 'user_signup' as const,
    request_id: '550e8400-e29b-41d4-a716-446655440000',
    timestamp: '2025-09-09T19:30:00.000Z',
    user: {
      id: '550e8400-e29b-41d4-a716-446655440001',
      name: 'João Silva',
      email: 'joao@example.com',
      cpf: '12345678901',
      phone: '11987654321'
    },
    item: {
      kind: 'course' as const,
      id: 'course_123',
      name: 'Cadastro gratuito',
      price_cents: 0,
      currency: 'BRL' as const
    },
    meta: {
      source: 'web' as const,
      user_agent: 'Mozilla/5.0...'
    }
  },
  
  course_purchase: {
    type: 'course_purchase' as const,
    request_id: '550e8400-e29b-41d4-a716-446655440002',
    timestamp: '2025-09-09T19:30:00.000Z',
    user: {
      id: '550e8400-e29b-41d4-a716-446655440001',
      name: 'João Silva',
      email: 'joao@example.com',
      cpf: '12345678901',
      phone: '11987654321'
    },
    item: {
      kind: 'course' as const,
      id: 'course_456',
      name: 'Curso Avançado de React',
      price_cents: 6900,
      currency: 'BRL' as const
    },
    meta: {
      source: 'web' as const,
      user_agent: 'Mozilla/5.0...'
    }
  },
  
  plan_purchase: {
    type: 'plan_purchase' as const,
    request_id: '550e8400-e29b-41d4-a716-446655440003',
    timestamp: '2025-09-09T19:30:00.000Z',
    user: {
      id: '550e8400-e29b-41d4-a716-446655440001',
      name: 'João Silva',
      email: 'joao@example.com',
      cpf: '12345678901',
      phone: '11987654321'
    },
    item: {
      kind: 'plan' as const,
      id: 'plan_789',
      name: 'Plano Premium Anual',
      price_cents: 59900,
      currency: 'BRL' as const,
      interval: 'annual' as const,
      included_courses: [
        {
          course_id: 'course_456',
          title: 'Curso Avançado de React'
        },
        {
          course_id: 'course_789',
          title: 'Curso de TypeScript'
        }
      ]
    },
    meta: {
      source: 'web' as const,
      user_agent: 'Mozilla/5.0...'
    }
  }
};