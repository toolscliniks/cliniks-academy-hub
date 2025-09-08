// Debug da chave API do Asaas
const encodedKey = '$aact_YTU5YTE0M2M2N2I4MTliNzk0YTI5N2U5MzdjNWZmNDQ6OjAwMDAwMDAwMDAwMDAwNzI4Mjk6OiRhYWNoXzRlNTU4YWI5LTExZWYtNGQyNy04MmY2LWY3YzQ0ODE2NzBkYQ==';

console.log('=== DEBUG CHAVE API ASAAS ===');
console.log('Chave original:', encodedKey);

// Remove o prefixo $aact_
const base64Part = encodedKey.substring(6);
console.log('Parte base64:', base64Part);

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
  
  // Testa se parece com uma chave válida do Asaas
  const isValidFormat = /^[a-f0-9]{32}$/.test(apiKey);
  console.log('Formato válido (32 chars hex):', isValidFormat);
  
  // Testa com a API do Asaas
  console.log('\n=== TESTANDO COM API ASAAS ===');
  testAsaasKey(apiKey);
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
    console.log('Resposta:', responseText.substring(0, 200));
    
    if (response.status === 401) {
      console.log('\n❌ Chave inválida para produção');
      console.log('Testando com sandbox...');
      
      const sandboxResponse = await fetch('https://sandbox.asaas.com/api/v3/customers?limit=1', {
        method: 'GET',
        headers: {
          'access_token': key,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Status sandbox:', sandboxResponse.status);
      const sandboxText = await sandboxResponse.text();
      console.log('Resposta sandbox:', sandboxText.substring(0, 200));
    }
  } catch (error) {
    console.error('Erro ao testar:', error);
  }
}