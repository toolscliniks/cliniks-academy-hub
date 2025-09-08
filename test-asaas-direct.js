// Teste direto com a API do Asaas - PRODUÇÃO
const apiKey = 'a59a143c67b819b794a297e937c5ff44';
const baseUrl = 'https://www.asaas.com/api/v3'; // URL de produção

async function testAsaasAPI() {
  try {
    console.log('Testando API do Asaas - PRODUÇÃO...');
    console.log('Chave API:', apiKey);
    console.log('URL base:', baseUrl);
    
    const response = await fetch(`${baseUrl}/customers?limit=1`, {
      method: 'GET',
      headers: {
        'access_token': apiKey,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Status da resposta:', response.status);
    console.log('Headers da resposta:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('Corpo da resposta:', responseText);
    
    if (response.ok) {
      console.log('✅ API do Asaas funcionando corretamente!');
    } else {
      console.log('❌ Erro na API do Asaas');
    }
  } catch (error) {
    console.error('Erro ao testar API:', error);
  }
}

testAsaasAPI();