// Teste para decodificar a chave do Asaas
const encodedKey = '$aact_YTU5YTE0M2M2N2I4MTliNzk0YTI5N2U5MzdjNWZmNDQ6OjAwMDAwMDAwMDAwMDAwNzI4Mjk6OiRhYWNoXzRlNTU4YWI5LTExZWYtNGQyNy04MmY2LWY3YzQ0ODE2NzBkYQ==';

console.log('Chave original:', encodedKey);

if (encodedKey.startsWith('$aact_')) {
  const base64Part = encodedKey.substring(6);
  console.log('Parte base64:', base64Part);
  
  try {
    const decoded = Buffer.from(base64Part, 'base64').toString('utf-8');
    console.log('String decodificada:', decoded);
    
    const parts = decoded.split('::');
    console.log('Partes separadas:', parts);
    
    if (parts.length > 0) {
      console.log('Chave API extraída:', parts[0]);
    }
  } catch (e) {
    console.error('Erro ao decodificar:', e);
  }
}