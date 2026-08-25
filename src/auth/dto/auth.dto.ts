import { IsEmail, IsNotEmpty, IsString, MinLength, MaxLength, Matches, IsOptional, IsIn } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}

export class ForgotPasswordDto {
  @IsEmail()
  email: string;
}

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsString()
  @MinLength(8)
  @MaxLength(50)
  @Matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_])/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
  })
  password: string;
}

export class RegisterStoreDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsEmail()
  @MaxLength(100)
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(50)
  @Matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_])/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
  })
  password: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  businessName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  businessType: string;

  @IsString()
  @MinLength(3)
  @MaxLength(20)
  @Matches(/^[a-z]+$/, {
    message: 'Subdomain must contain only lowercase English letters',
  })
  subdomain: string;

  @IsString()
  @Matches(/^\d{10}$/, { message: 'Phone number must be exactly 10 digits' })
  phone: string;
}

export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

export class UpdatePlanDto {
  @IsIn(['STARTUP', 'PRO', 'ENTERPRISE'])
  plan: string;
}

export class RegisterCustomerDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsEmail()
  @MaxLength(100)
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(50)
  password: string;

  @IsString()
  @IsNotEmpty()
  subdomain: string;
}

export class SyncDeviceDto {
  @IsString()
  @IsNotEmpty()
  fingerprint: string;
}

