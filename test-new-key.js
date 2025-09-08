// Teste da nova chave API do Asaas
const newEncodedKey = '$aact_prod_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6Ojc3N2JhOTUyLTVlZmItNDk5NS04YWUxLTUzYWJiZjIyMTg5MDo6JGFhY2hfYWYwZTkzZmUtN2U3Ni00MDI4LTg3ZDUtZjQyMzAyMzQzOWJm';

console.log('=== TESTE NOVA CHAVE API ASAAS ===');
console.log('Chave original:', newEncodedKey);

// Remove o prefixo $aact_prod_000
const base64Part = newEncodedKey.substring(14); // Remove $aact_prod_000 prefix
console.log('Parte base64:', base64Part);

try {
  // Decodifica
  const decodedString = atob(base64Part);
  console.log('String decodificada:', decodedString);
  
  // Separa por ::
  const parts = decodedString.split('::');
  console.log('Partes separadas:', parts);
  console.log('Número de partes:', parts.length);
  
  if (parts.length > 0) {
    const apiKey = parts[0];
    console.log('Chave API extraída:', apiKey);
    console.log('Comprimento da chave:', apiKey.length);
    
    // Testa com a API do Asaas
    console.log('\n=== TESTANDO COM API ASAAS PRODUÇÃO ===');
    testAsaasKey(apiKey);
  }
} catch (error) {
  console.error('Erro ao decodificar:', error);
  console.log('Tentando usar a chave sem decodificação...');
  
  // Tenta usar sem decodificação
  const keyWithoutPrefix = newEncodedKey.substring(14);
  console.log('Chave sem prefixo:', keyWithoutPrefix);
  testAsaasKey(keyWithoutPrefix);
}

async function testAsaasKey(key) {
  try {
    const response = await fetch('https://www.asaas.com/api/v3/customers?limit=1', {
      method: 'GET',
      headers: {
        'access_token': key,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Status da resposta:', response.status);
    const responseText = await response.text();
    console.log('Resposta:', responseText.substring(0, 300));
    
    if (response.ok) {
      console.log('✅ Chave API funcionando corretamente!');
    } else {
      console.log('❌ Chave API inválida');
    }
  } catch (error) {
    console.error('Erro ao testar:', error);
  }
}