import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = 'https://kisnmhcncgiwysbrcdkw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtpc25taGNuY2dpd3lzYnJjZGt3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5MTgyOTUsImV4cCI6MjA2NzQ5NDI5NX0.lGjTRuCPW3O4tKev8gD-o6GiELWYz9ZXElSuv_BpfhE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testPaymentFlow() {
  try {
    console.log('🧪 Testando fluxo completo de pagamento...');
    
    // Vamos testar diretamente a função sem autenticação primeiro
    console.log('⚠️  Pulando autenticação para teste direto da função...');
    
    // Simular dados de usuário conhecido
    const userId = '6e1aba08-307e-4f15-92bf-9b7dbd5ace81';
    const userEmail = 'gilejob+1@gmail.com';
    
    // 2. Buscar um curso disponível
    console.log('📚 Buscando cursos disponíveis...');
    const { data: courses, error: coursesError } = await supabase
      .from('courses')
      .select('id, title, price')
      .limit(1);
    
    if (coursesError || !courses || courses.length === 0) {
      console.error('❌ Erro ao buscar cursos:', coursesError);
      return;
    }
    
    const course = courses[0];
    console.log('✅ Curso encontrado:', course.title, '- R$', course.price);
    
    // 3. Chamar a função de pagamento
    console.log('💳 Criando pagamento...');
    
    const paymentData = {
      courseId: course.id,
      customerName: 'Godofredo Ávila',
      customerEmail: 'gilejob+1@gmail.com',
      customerCpfCnpj: '775.464.437-17',
      customerPhone: '11987654321'
    };
    
    // Testar diretamente via HTTP
    const functionUrl = `${supabaseUrl}/functions/v1/create-payment-asaas`;
    
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey
      },
      body: JSON.stringify(paymentData)
    });
    
    const paymentResult = await response.json();
    const paymentError = !response.ok ? paymentResult : null;
    
    if (paymentError) {
      console.error('❌ Erro ao criar pagamento:', paymentError);
      return;
    }
    
    console.log('✅ Pagamento criado com sucesso!');
    console.log('📊 Dados do pagamento:', JSON.stringify(paymentResult, null, 2));
    
    // 4. Verificar se o registro foi criado na tabela invoices
    console.log('🔍 Verificando registro na tabela invoices...');
    const { data: invoices, error: invoicesError } = await supabase
      .from('invoices')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (invoicesError) {
      console.error('❌ Erro ao buscar invoices:', invoicesError);
      return;
    }
    
    if (invoices && invoices.length > 0) {
      console.log('✅ Invoice criada:', invoices[0]);
    } else {
      console.log('⚠️  Nenhuma invoice encontrada');
    }
    
    console.log('🎉 Teste do fluxo de pagamento concluído!');
    
  } catch (error) {
    console.error('❌ Erro geral no teste:', error.message);
  } finally {
    // Fazer logout
    await supabase.auth.signOut();
    console.log('🚪 Logout realizado');
  }
}

testPaymentFlow();