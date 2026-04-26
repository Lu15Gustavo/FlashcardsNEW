type AuthErrorContext = "generic" | "login" | "signup" | "forgot" | "reset" | "confirmation";

function normalizeError(errorMessage: string) {
  try {
    return decodeURIComponent(errorMessage).toLowerCase().trim();
  } catch {
    return errorMessage.toLowerCase().trim();
  }
}

export function mapAuthErrorMessage(errorMessage: string, context: AuthErrorContext = "generic") {
  const normalized = normalizeError(errorMessage);

  if (
    /rate limit exceeded|email rate limit exceeded|too many requests|over_email_send_limit|request rate limit reached/.test(
      normalized
    )
  ) {
    return "Você solicitou esse e-mail muitas vezes. Aguarde alguns minutos e tente novamente.";
  }

  if (/invalid login credentials|invalid credentials|invalid email or password/.test(normalized)) {
    return "E-mail ou senha inválidos. Verifique os dados e tente novamente.";
  }

  if (/email not confirmed|confirm your email|email_not_confirmed|not_confirmed|unconfirmed/.test(normalized)) {
    return "Ainda precisa confirma a conta";
  }

  if (/already registered|already exists|user already registered|já está cadastrado/.test(normalized)) {
    return "Este e-mail já possui uma conta. Faça login ou use Esqueci minha senha.";
  }

  if (/otp_expired|token has expired|expired/.test(normalized)) {
    return "Esse link expirou. Solicite um novo e-mail.";
  }

  if (/otp_invalid|invalid token|token is invalid|invalid otp/.test(normalized)) {
    return "Esse link é inválido. Solicite um novo e-mail.";
  }

  if (/password should be at least|weak password/.test(normalized)) {
    return "A senha é muito fraca. Use pelo menos 6 caracteres.";
  }

  if (/same password|password should be different|new password should be different/.test(normalized)) {
    return "A nova senha precisa ser diferente da senha atual.";
  }

  if (/user not found/.test(normalized)) {
    return "Não encontramos uma conta com esse e-mail.";
  }

  if (context === "login") {
    return "Não foi possível fazer login agora. Tente novamente em instantes.";
  }

  if (context === "signup") {
    return "Não foi possível concluir o cadastro agora. Tente novamente em instantes.";
  }

  if (context === "forgot") {
    return "Não foi possível enviar o e-mail de recuperação agora. Tente novamente em instantes.";
  }

  if (context === "reset") {
    return "Não foi possível redefinir sua senha agora. Tente novamente em instantes.";
  }

  if (context === "confirmation") {
    return "Não foi possível validar seu link de confirmação. Solicite um novo e-mail.";
  }

  return "Ocorreu um erro inesperado. Tente novamente em instantes.";
}
