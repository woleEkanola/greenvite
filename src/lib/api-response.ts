import 'server-only'
import { NextResponse } from 'next/server'

interface ApiSuccessResponse<T = unknown> {
  success: true
  data: T
}

interface ApiErrorResponse {
  success: false
  error: string
}

type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data } satisfies ApiSuccessResponse<T>, { status })
}

export function apiError(error: string, status = 400) {
  return NextResponse.json({ success: false, error } satisfies ApiErrorResponse, { status })
}

export type { ApiResponse, ApiSuccessResponse, ApiErrorResponse }
