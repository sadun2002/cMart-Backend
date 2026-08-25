import { IsString, IsNotEmpty, IsBoolean, IsOptional, Matches, MinLength, MaxLength } from 'class-validator';

export class AddAddressDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  type: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(50)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  @MaxLength(100)
  street: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  city: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  country: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\+?[0-9]{9,15}$/, { message: 'phone must be a valid phone number with 9 to 15 digits' })
  phone: string;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}

export class AddCardDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  brand: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[0-9]{4}$/, { message: 'last4 must be exactly 4 digits' })
  last4: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^(0[1-9]|1[0-2])\/[0-9]{2}$/, { message: 'expiry must be in MM/YY format' })
  expiry: string;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}

export class CreateOrderDto {
  @IsString()
  @IsNotEmpty()
  customerName: string;

  @IsString()
  @IsNotEmpty()
  customerEmail: string;

  @IsString()
  @IsNotEmpty()
  customerPhone: string;

  @IsString()
  @IsOptional()
  shippingAddress?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  paymentMethod?: string;

  @IsString()
  @IsOptional()
  paymentStatus?: string;

  @IsOptional()
  subtotal: any;

  @IsOptional()
  tax: any;

  @IsOptional()
  shipping: any;

  @IsOptional()
  discount: any;

  @IsOptional()
  total: any;

  @IsOptional()
  items: any[];
}
