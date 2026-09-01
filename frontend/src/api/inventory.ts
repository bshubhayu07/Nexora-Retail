import { apiClient } from './client';
import { ShelfStatusResponseDTO } from '../types/api';

export async function fetchShelfInventory(): Promise<ShelfStatusResponseDTO[]> {
  return apiClient<ShelfStatusResponseDTO[]>('/inventory/shelves');
}

export async function triggerRestock(aisleName: string): Promise<{ status: string; message: string }> {
  const encoded = encodeURIComponent(aisleName);
  return apiClient(`/inventory/restock/${encoded}`, {
    method: 'POST',
  });
}
