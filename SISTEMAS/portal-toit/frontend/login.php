<?php
// login.php
session_start();

// Configurações do banco de dados (ajuste para seu ambiente Hostinger)
$host = 'localhost';
$db = 'u527961246_TOIT';
$user = 'u527961246_toitbd'; // Substitua pelo usuário do banco
$pass = 'Hrng@*01';   // Substitua pela senha do banco

// Conexão
$conn = new mysqli($host, $user, $pass, $db);
if ($conn->connect_error) {
    die('Erro de conexão: ' . $conn->connect_error);
}

// Recebe dados do formulário
$cpf = isset($_POST['cpf']) ? preg_replace('/\D/', '', $_POST['cpf']) : '';
$senha = isset($_POST['senha']) ? $_POST['senha'] : '';

// Consulta segura
$stmt = $conn->prepare('SELECT id, perfil, clienteKey, senha FROM usuario WHERE cpf = ? LIMIT 1');
$stmt->bind_param('s', $cpf);
$stmt->execute();
$result = $stmt->get_result();

if ($row = $result->fetch_assoc()) {
    // Validação de senha (ajuste para hash se necessário)
    if ($row['senha'] === $senha) {
        $_SESSION['usuario_id'] = $row['id'];
        $_SESSION['perfil'] = $row['perfil'];
        $_SESSION['clienteKey'] = $row['clienteKey'];
        // Redirecionamento conforme regras
        if ($row['perfil'] === 'ADMIN' || $row['perfil'] === 'TOIT') {
            header('Location: /portal/principal.html'); // ajuste para a página principal do portal
            exit;
        } elseif ($row['perfil'] === 'CLIENTE') {
            header('Location: /portal/blueworld/blueworld.html');
            exit;
        }
    } else {
        header('Location: index.html?erro=senha');
        exit;
    }
} else {
    header('Location: index.html?erro=usuario');
    exit;
}
?>
