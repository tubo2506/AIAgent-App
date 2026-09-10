/**
 * Tavily AI Search API Service (With Smart 7-Day Query Caching)
 * Cung cấp khả năng tìm kiếm web thời gian thực tối ưu cho LLM / AI Agent
 * Tích hợp bộ nhớ đệm (Query Cache) tự động để tiết kiệm tối đa hạn ngạch 1.000 lượt
 */

export interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

export interface TavilySearchOutput {
  query: string;
  answer?: string;
  results: TavilySearchResult[];
  formattedContext: string;
  sources: Array<{ title: string; url: string }>;
  isFromCache?: boolean;
}

const STORAGE_CACHE_KEY = 'gemini_tavily_search_cache_v1';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // Lưu cache 7 ngày (168 giờ)

/**
 * Chuẩn hóa câu truy vấn để tăng tỷ lệ trúng cache
 */
function normalizeQuery(q: string): string {
  return q
    .toLowerCase()
    .replace(/[?!.,;:()\[\]{}"'“”]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Lấy kết quả tìm kiếm từ Cache cục bộ
 */
function getCachedSearch(query: string): TavilySearchOutput | null {
  try {
    const raw = localStorage.getItem(STORAGE_CACHE_KEY);
    if (!raw) return null;

    const cache: Record<string, { timestamp: number; output: TavilySearchOutput }> = JSON.parse(raw);
    const key = normalizeQuery(query);
    const entry = cache[key];

    if (!entry) return null;

    // Kiểm tra hết hạn TTL (7 ngày)
    if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
      delete cache[key];
      localStorage.setItem(STORAGE_CACHE_KEY, JSON.stringify(cache));
      return null;
    }

    return entry.output;
  } catch {
    return null;
  }
}

/**
 * Lưu kết quả tìm kiếm vào Cache cục bộ
 */
function setCachedSearch(query: string, output: TavilySearchOutput): void {
  try {
    const raw = localStorage.getItem(STORAGE_CACHE_KEY);
    const cache: Record<string, { timestamp: number; output: TavilySearchOutput }> = raw ? JSON.parse(raw) : {};
    const key = normalizeQuery(query);

    // Giữ tối đa 100 câu truy vấn gần nhất để không tràn localStorage
    const keys = Object.keys(cache);
    if (keys.length > 100) {
      delete cache[keys[0]];
    }

    cache[key] = {
      timestamp: Date.now(),
      output,
    };

    localStorage.setItem(STORAGE_CACHE_KEY, JSON.stringify(cache));
  } catch (err) {
    console.warn('Không thể lưu cache Tavily vào localStorage:', err);
  }
}

/**
 * Xóa toàn bộ bộ nhớ đệm tìm kiếm
 */
export function clearTavilyCache(): void {
  try {
    localStorage.removeItem(STORAGE_CACHE_KEY);
  } catch {}
}

/**
 * Kiểm tra tính hợp lệ của Tavily API Key
 */
export async function testTavilyConnection(apiKey: string): Promise<{ success: boolean; message: string }> {
  if (!apiKey || !apiKey.trim()) {
    return { success: false, message: 'Chưa nhập Tavily API Key.' };
  }

  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: apiKey.trim(),
        query: 'ping test',
        search_depth: 'basic',
        max_results: 1,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      const errMsg = data?.detail?.error || data?.message || `HTTP ${res.status}`;
      return { success: false, message: `Lỗi Tavily API: ${errMsg}` };
    }

    return { success: true, message: 'Kết nối Tavily API thành công! Sẵn sàng tra cứu web.' };
  } catch (err: any) {
    return { success: false, message: `Không thể kết nối đến Tavily: ${err.message || err}` };
  }
}

/**
 * Thực hiện tìm kiếm web thời gian thực với Tavily AI Search (Tự động đọc Cache)
 */
export async function searchTavily(
  query: string,
  apiKey: string,
  options?: { maxResults?: number; searchDepth?: 'basic' | 'advanced'; bypassCache?: boolean }
): Promise<TavilySearchOutput> {
  if (!apiKey || !apiKey.trim()) {
    throw new Error('Chưa cấu hình Tavily API Key. Vui lòng vào Cài đặt để nhập Key miễn phí.');
  }

  // 1. Kiểm tra Cache trước (Tiết kiệm 100% request nếu đã tìm trước đó trong 7 ngày)
  if (!options?.bypassCache) {
    const cached = getCachedSearch(query);
    if (cached) {
      console.log('⚡ [Tavily Cache Hit] Phản hồi tức thì từ bộ nhớ đệm (0 tốn request Tavily):', query);
      return {
        ...cached,
        isFromCache: true,
      };
    }
  }

  const maxResults = options?.maxResults || 5;
  const searchDepth = options?.searchDepth || 'basic';

  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      api_key: apiKey.trim(),
      query: query.trim(),
      search_depth: searchDepth,
      include_answer: true,
      max_results: maxResults,
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    const errMsg = data?.detail?.error || data?.message || `HTTP ${res.status}`;
    if (res.status === 401) {
      throw new Error('Tavily API Key không hợp lệ hoặc đã hết hạn ngạch.');
    }
    throw new Error(`Lỗi tìm kiếm Tavily: ${errMsg}`);
  }

  const results: TavilySearchResult[] = (data.results || []).map((r: any) => ({
    title: r.title || 'Nguồn tin tức web',
    url: r.url || '',
    content: r.content || '',
    score: r.score || 0,
  }));

  const sources = results
    .filter((r) => r.url)
    .map((r) => ({ title: r.title, url: r.url }));

  // Xây dựng đoạn ngữ cảnh định dạng chuẩn cho LLM
  let formattedContext = `\n\n[DỮ LIỆU TÌM KIẾM WEB THỜI GIAN THỰC (Tavily AI Search - Cập nhật mới nhất)]\n`;
  if (data.answer) {
    formattedContext += `Tóm tắt nhanh từ web: ${data.answer}\n\n`;
  }

  formattedContext += `Chi tiết các kết quả tìm kiếm:\n`;
  results.forEach((item, index) => {
    formattedContext += `[Nguồn ${index + 1}] ${item.title}\n`;
    if (item.url) formattedContext += `Đường dẫn: ${item.url}\n`;
    formattedContext += `Trích đoạn: ${item.content}\n\n`;
  });

  formattedContext += `HÃY SỬ DỤNG DỮ LIỆU TÌM KIẾM MỚI NHẤT TRÊN ĐỂ TRẢ LỜI CÂU HỎI CỦA NGƯỜI DÙNG VÀ TRÍCH DẪN RÕ RÀNG NGUỒN CUNG CẤP THÔNG TIN.\n`;

  const output: TavilySearchOutput = {
    query,
    answer: data.answer,
    results,
    formattedContext,
    sources,
    isFromCache: false,
  };

  // Lưu vào Cache cho các lần hỏi sau
  setCachedSearch(query, output);

  return output;
}
