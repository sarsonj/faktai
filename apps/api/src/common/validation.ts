import { BadRequestException, ValidationError } from '@nestjs/common';

function collectMessages(errors: ValidationError[]): string[] {
  const messages: string[] = [];

  for (const error of errors) {
    if (error.constraints) {
      messages.push(...Object.values(error.constraints));
    }
    if (error.children && error.children.length > 0) {
      messages.push(...collectMessages(error.children));
    }
  }

  return messages;
}

export function createValidationException(errors: ValidationError[]) {
  const messages = collectMessages(errors);
  if (messages.length === 0) {
    return new BadRequestException('Neplatná vstupní data.');
  }
  if (messages.length === 1) {
    return new BadRequestException(messages[0]);
  }
  return new BadRequestException(messages);
}
