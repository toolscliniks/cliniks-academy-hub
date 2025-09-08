// Script de teste para validar a integração completa com Asaas
// Execute após o Supabase estar rodando localmente

const SUPABASE_URL = 'http://localhost:54321';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

async function testCreatePayment() {
  console.log('🧪 Testando criação de pagamento...');
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/create-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        type: 'course',
        courseId: 1,
        billingType: 'PIX',
        customerName: 'Cliente Teste',
        customerEmail: 'teste@exemplo.com',
        customerCpfCnpj: '12345678901',
        customerPhone: '11999999999'
      })
    });
    
    const result = await response.json();
    console.log('✅ Resposta da criação de pagamento:', result);
    
    if (result.error) {
      console.error('❌ Erro na criação:', result.error);
    } else {
      console.log('✅ Pagamento criado com sucesso!');
      console.log('💰 ID do pagamento:', result.paymentId);
      console.log('🔗 URL de pagamento:', result.invoiceUrl);
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  }
}

async function testWebhookSecurity() {
  console.log('🔒 Testando segurança do webhook...');
  
  try {
    // Teste com User-Agent inválido
    const invalidResponse = await fetch(`${SUPABASE_URL}/functions/v1/payment-webhook-asaas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'InvalidAgent'
      },
      body: JSON.stringify({
        event: 'PAYMENT_RECEIVED',
        payment: {
          id: 'test-payment-id',
          externalReference: 'test-invoice-id'
        }
      })
    });
    
    if (invalidResponse.status === 403) {
      console.log('✅ Validação de User-Agent funcionando corretamente');
    } else {
      console.log('⚠️ Validação de User-Agent pode não estar funcionando');
    }
    
  } catch (error) {
    console.error('❌ Erro no teste de segurança:', error.message);
  }
}

async function testRateLimit() {
  console.log('⏱️ Testando rate limiting...');
  
  try {
    const promises = [];
    
    // Fazer 12 requisições rapidamente para testar o limite de 10/minuto
    for (let i = 0; i < 12; i++) {
      promises.push(
        fetch(`${SUPABASE_URL}/functions/v1/create-payment`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({
            type: 'course',
            courseId: 1,
            billingType: 'PIX',
            customerName: `Cliente Teste ${i}`,
            customerEmail: `teste${i}@exemplo.com`
          })
        })
      );
    }
    
    const responses = await Promise.all(promises);
    const rateLimitedResponses = responses.filter(r => r.status === 429);
    
    if (rateLimitedResponses.length > 0) {
      console.log(`✅ Rate limiting funcionando: ${rateLimitedResponses.length} requisições bloqueadas`);
    } else {
      console.log('⚠️ Rate limiting pode não estar funcionando ou tabela não existe');
    }
    
  } catch (error) {
    console.error('❌ Erro no teste de rate limit:', error.message);
  }
}

async function runAllTests() {
  console.log('🚀 Iniciando testes de integração...');
  console.log('=' .repeat(50));
  
  await testCreatePayment();
  console.log('\n' + '-'.repeat(30) + '\n');
  
  await testWebhookSecurity();
  console.log('\n' + '-'.repeat(30) + '\n');
  
  await testRateLimit();
  
  console.log('\n' + '='.repeat(50));
  console.log('✅ Testes concluídos!');
}

// Executar testes
runAllTests().catch(console.error);