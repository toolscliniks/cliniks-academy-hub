# 📚 Análise do Sistema de Cursos - Cliniks AI

## 🔍 **DIAGNÓSTICO ATUAL**

### **Sistema Principal (rpfrmclsraiidjlfeonj)**
- ✅ Sistema de clínicas e protocolos funcionando
- ✅ Sistema de assinaturas básico (R$ 6/mês, R$ 238,80/ano)
- ❌ **PROBLEMA**: Variáveis Asaas não configuradas
- ❌ **PROBLEMA**: Webhook N8N não configurado

### **Sistema Academy (kisnmhcncgiwysbrcdkw)**
- ✅ 4 cursos cadastrados (R$ 69 a R$ 299)
- ✅ 2 planos (Promocional R$ 30/mês, G2 R$ 24/mês)
- ✅ Sistema completo: courses, modules, lessons, progress
- ✅ Certificados e relatórios implementados

## 🎯 **SOLUÇÃO PROPOSTA**

### **1. Integração dos Sistemas**
Unificar os dois projetos em uma solução completa:

#### **Estrutura de Banco Unificada**
```sql
-- Tabela de cursos
CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  instructor_name TEXT,
  duration_hours INTEGER DEFAULT 0,
  difficulty_level TEXT DEFAULT 'Iniciante',
  category TEXT,
  price DECIMAL(10,2),
  is_published BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  trailer_video_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de módulos
CREATE TABLE course_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de aulas
CREATE TABLE course_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID REFERENCES course_modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT,
  duration_minutes INTEGER DEFAULT 0,
  order_index INTEGER NOT NULL,
  is_free BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de planos de curso
CREATE TABLE course_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price_monthly DECIMAL(10,2),
  price_yearly DECIMAL(10,2),
  features TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Relacionamento planos x cursos
CREATE TABLE plan_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES course_plans(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Compras individuais de cursos
CREATE TABLE course_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  course_id UUID REFERENCES courses(id),
  purchase_type TEXT CHECK (purchase_type IN ('individual', 'package')),
  amount_paid DECIMAL(10,2),
  access_expires_at TIMESTAMPTZ, -- 1 ano após compra
  asaas_payment_id TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Progresso do usuário
CREATE TABLE user_course_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  course_id UUID REFERENCES courses(id),
  lesson_id UUID REFERENCES course_lessons(id),
  is_completed BOOLEAN DEFAULT false,
  watch_time_seconds INTEGER DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### **2. Tipos de Compra Implementados**

#### **A. Planos Recorrentes (Assinatura)**
- **Mensal**: R$ 30/mês - Acesso a cursos selecionados
- **Anual**: R$ 300/ano - Acesso a todos os cursos + desconto
- **Configurável no admin**: Quais cursos estão em cada plano

#### **B. Compra Individual**
- **Curso único**: Acesso por 1 ano ao curso específico
- **Preço individual**: Definido por curso (R$ 69 a R$ 299)

#### **C. Pacotes/Ofertas**
- **Combo de cursos**: Grupos de cursos com desconto
- **Ofertas temporárias**: Promoções configuráveis
- **Exemplo**: "Pacote Vendas" = 3 cursos por R$ 199

### **3. Painel Administrativo**

#### **Gestão de Cursos**
- ✅ Criar/editar cursos
- ✅ Upload de vídeos e materiais
- ✅ Organizar módulos e aulas
- ✅ Definir preços individuais

#### **Gestão de Planos**
- ✅ Criar planos de assinatura
- ✅ Selecionar cursos incluídos
- ✅ Definir preços mensais/anuais
- ✅ Ativar/desativar planos

#### **Gestão de Ofertas**
- ✅ Criar pacotes de cursos
- ✅ Definir descontos
- ✅ Configurar período de validade
- ✅ Acompanhar conversões

#### **Relatórios**
- ✅ Vendas por curso
- ✅ Performance de planos
- ✅ Progresso dos alunos
- ✅ Receita mensal/anual

### **4. Fluxo de Compra**

#### **Plano Recorrente**
```
1. Usuário escolhe plano (mensal/anual)
2. Redirecionamento para Asaas
3. Pagamento aprovado via webhook
4. Acesso liberado aos cursos do plano
5. Renovação automática
```

#### **Compra Individual**
```
1. Usuário escolhe curso específico
2. Pagamento único via Asaas
3. Pagamento aprovado via webhook
4. Acesso liberado por 1 ano
5. Sem renovação automática
```

#### **Pacote/Oferta**
```
1. Usuário escolhe pacote
2. Pagamento único com desconto
3. Pagamento aprovado via webhook
4. Acesso liberado a todos os cursos do pacote
5. Validade de 1 ano
```

## 🚀 **IMPLEMENTAÇÃO**

### **Fase 1: Correção dos Problemas Atuais**
1. ✅ Configurar variáveis Asaas
2. ✅ Testar pagamentos
3. ✅ Configurar webhook N8N

### **Fase 2: Migração do Sistema de Cursos**
1. ✅ Criar tabelas no projeto principal
2. ✅ Migrar dados do Academy
3. ✅ Implementar componentes React

### **Fase 3: Sistema de Compras**
1. ✅ Implementar compra individual
2. ✅ Implementar pacotes/ofertas
3. ✅ Integrar com sistema de assinaturas

### **Fase 4: Painel Administrativo**
1. ✅ Interface de gestão de cursos
2. ✅ Interface de gestão de planos
3. ✅ Relatórios e analytics

## 📊 **BENEFÍCIOS DA SOLUÇÃO**

### **Para o Negócio**
- 💰 **Múltiplas fontes de receita**: Assinaturas + vendas individuais
- 📈 **Flexibilidade de preços**: Diferentes modelos de monetização
- 🎯 **Segmentação**: Planos para diferentes perfis de cliente
- 📊 **Analytics completos**: Acompanhamento detalhado de performance

### **Para os Usuários**
- 🎓 **Flexibilidade**: Escolher entre assinatura ou compra individual
- 💡 **Acesso personalizado**: Pagar apenas pelo que precisa
- 📱 **Experiência unificada**: Tudo em uma plataforma
- 🏆 **Certificados**: Reconhecimento do aprendizado

### **Para Administradores**
- ⚙️ **Controle total**: Configurar preços, planos e ofertas
- 📈 **Relatórios detalhados**: Acompanhar vendas e progresso
- 🔧 **Fácil manutenção**: Interface intuitiva de gestão
- 🚀 **Escalabilidade**: Sistema preparado para crescimento

## ✅ **PRÓXIMOS PASSOS**

1. **Configurar variáveis de ambiente Asaas**
2. **Implementar migração das tabelas de cursos**
3. **Criar componentes React para o sistema de cursos**
4. **Implementar fluxos de compra individual e por pacotes**
5. **Desenvolver painel administrativo completo**

**Tempo estimado**: 2-3 semanas para implementação completa
**Prioridade**: Alta - Sistema crítico para monetização