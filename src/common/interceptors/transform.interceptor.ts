import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
  };
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data) => {
        // If the response already has success/data shape, return as-is
        if (data && typeof data === 'object' && 'success' in data) return data;

        // Handle paginated responses
        if (data && typeof data === 'object' && 'items' in data) {
          const { items, total, page, limit } = data as any;
          return {
            success: true,
            data: items,
            meta: {
              total,
              page,
              limit,
              totalPages: Math.ceil(total / limit),
            },
          };
        }

        return { success: true, data };
      }),
    );
  }
}
