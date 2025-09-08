// Teste de diferentes formatos da chave API do Asaas
const encodedKey = '$aact_prod_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6Ojc3N2JhOTUyLTVlZmItNDk5NS04YWUxLTUzYWJiZjIyMTg5MDo6JGFhY2hfYWYwZTkzZmUtN2U3Ni00MDI4LTg3ZDUtZjQyMzAyMzQzOWJm';

console.log('=== TESTE DE DIFERENTES FORMATOS DE CHAVE ===');

// Decodifica a chave
const base64Part = encodedKey.substring(14);
const decodedString = atob(base64Part);
const parts = decodedString.split('::');
const extractedKey = parts[0];

console.log('Chave extraída:', extractedKey);
console.log('Todas as partes:', parts);

// Testa diferentes formatos
const testKeys = [
  extractedKey, // Chave extraída simples
  `$aact_${extractedKey}`, // Com prefixo $aact_
  `$aact_prod_${extractedKey}`, // Com prefixo $aact_prod_
  parts.join('::'), // String completa decodificada
  encodedKey, // Chave original codificada
  base64Part, // Apenas a parte base64
];

console.log('\n=== TESTANDO DIFERENTES FORMATOS ===');

for (let i = 0; i < testKeys.length; i++) {
  const key = testKeys[i];
  const formats = [
    'Chave extraída simples',
    'Com prefixo $aact_',
    'Com prefixo $aact_prod_',
    'String completa decodificada',
    'Chave original codificada',
    'Apenas parte base64'
  ];
  
  console.log(`\n--- Testando formato ${i + 1}: ${formats[i]} ---`);
  console.log('Chave:', key.substring(0, 30) + '...');
  console.log('Comprimento:', key.length);
  
  await testAsaasKey(key, i + 1);
}

async function testAsaasKey(key, formatNumber) {
  try {
    const response = await fetch('https://www.asaas.com/api/v3/customers?limit=1', {
      method: 'GET',
      headers: {
        'access_token': key,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`Status (formato ${formatNumber}):`, response.status);
    
    if (response.ok) {
      console.log(`✅ SUCESSO! Formato ${formatNumber} funcionou!`);
      const responseData = await response.text();
      console.log('Resposta:', responseData.substring(0, 200));
      return true;
    } else {
      const errorData = await response.text();
      console.log(`❌ Erro (formato ${formatNumber}):`, errorData.substring(0, 100));
    }
  } catch (error) {
    console.error(`Erro ao testar formato ${formatNumber}:`, error.message);
  }
  return false;
}