// Teste de validação da chave API do Asaas
const newEncodedKey = '$aact_prod_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6Ojc3N2JhOTUyLTVlZmItNDk5NS04YWUxLTUzYWJiZjIyMTg5MDo6JGFhY2hfYWYwZTkzZmUtN2U3Ni00MDI4LTg3ZDUtZjQyMzAyMzQzOWJm';

console.log('=== TESTE DE VALIDAÇÃO DA CHAVE API ===');
console.log('Chave original:', newEncodedKey);

// Simula a lógica da função create-payment
let ASAAS_API_KEY = newEncodedKey;

if (ASAAS_API_KEY && ASAAS_API_KEY.startsWith('$aact_')) {
  try {
    console.log('Decodificando chave API do Asaas...');
    let base64Part;
    
    // Handle different key formats
    if (ASAAS_API_KEY.startsWith('$aact_prod_000')) {
      base64Part = ASAAS_API_KEY.substring(14); // Remove $aact_prod_000 prefix
      console.log('Usando formato de chave de produção com prefixo $aact_prod_000');
    } else {
      base64Part = ASAAS_API_KEY.substring(6); // Remove $aact_ prefix
      console.log('Usando formato de chave padrão com prefixo $aact_');
    }
    
    console.log('Comprimento da parte base64:', base64Part.length);
    console.log('Parte base64:', base64Part);
    
    // Decode the base64 string directly
    const decodedString = atob(base64Part);
    console.log('String decodificada:', decodedString.substring(0, 50) + '...');
    
    // Extract the actual API key from the decoded string
    // The format is usually: api_key::other_data::more_data
    const parts = decodedString.split('::');
    console.log('Partes separadas:', parts.length);
    
    if (parts.length > 0) {
      ASAAS_API_KEY = parts[0]; // Use the first part as the API key
      console.log('Chave API extraída da string decodificada:', ASAAS_API_KEY.substring(0, 20) + '...');
    } else {
      ASAAS_API_KEY = decodedString; // Use the whole decoded string if no separator found
    }
    
    console.log('Chave API decodificada com sucesso');
    console.log('Formato final da chave:', ASAAS_API_KEY.substring(0, 20) + '...');
    console.log('Comprimento final da chave:', ASAAS_API_KEY.length);
  } catch (e) {
    console.error('Falha ao decodificar a chave API:', e);
    console.error('Detalhes do erro:', e.message);
    // If decoding fails, try using the key as-is (maybe it's not base64 encoded)
    console.log('Tentando usar a chave como está, sem decodificação');
    ASAAS_API_KEY = ASAAS_API_KEY.substring(6); // Just remove the prefix
  }
}

console.log('\n=== TESTANDO CHAVE FINAL COM API ASAAS ===');
testAsaasKey(ASAAS_API_KEY);

async function testAsaasKey(key) {
  console.log('Testando chave:', key.substring(0, 20) + '...');
  console.log('Comprimento da chave:', key.length);
  
  try {
    // Teste com produção
    console.log('\n--- Testando com API de Produção ---');
    const prodResponse = await fetch('https://www.asaas.com/api/v3/customers?limit=1', {
      method: 'GET',
      headers: {
        'access_token': key,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Status da resposta (produção):', prodResponse.status);
    const prodResponseText = await prodResponse.text();
    console.log('Resposta (produção):', prodResponseText.substring(0, 200));
    
    if (prodResponse.ok) {
      console.log('✅ Chave API funcionando na produção!');
      return;
    }
    
    // Teste com sandbox
    console.log('\n--- Testando com API de Sandbox ---');
    const sandboxResponse = await fetch('https://sandbox.asaas.com/api/v3/customers?limit=1', {
      method: 'GET',
      headers: {
        'access_token': key,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Status da resposta (sandbox):', sandboxResponse.status);
    const sandboxResponseText = await sandboxResponse.text();
    console.log('Resposta (sandbox):', sandboxResponseText.substring(0, 200));
    
    if (sandboxResponse.ok) {
      console.log('✅ Chave API funcionando no sandbox!');
    } else {
      console.log('❌ Chave API inválida em ambos os ambientes');
    }
  } catch (error) {
    console.error('Erro ao testar:', error);
  }
}