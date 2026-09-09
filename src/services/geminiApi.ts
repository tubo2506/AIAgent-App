import type { ApiConfig, ApiResponseData } from '../types';

export function buildEndpointUrl(config: ApiConfig, action = 'generateContent'): string {
  let base: string;

  if (config.useProxy) {
    base = `/api/gemini-proxy/${config.apiVersion}/models/${config.model}:${action}`;
  } else if (config.customBaseUrl && config.customBaseUrl.trim() !== '') {
    const trimmed = config.customBaseUrl.trim().replace(/\/+$/, '');
    base = `${trimmed}/${config.apiVersion}/models/${config.model}:${action}`;
  } else {
    base = `https://generativelanguage.googleapis.com/${config.apiVersion}/models/${config.model}:${action}`;
  }

  const queryParams: string[] = [];
  if (action === 'streamGenerateContent') {
    queryParams.push('alt=sse');
  }
  if (config.authMode === 'query' && config.apiKey) {
    queryParams.push(`key=${encodeURIComponent(config.apiKey)}`);
  }

  if (queryParams.length > 0) {
    base += `?${queryParams.join('&')}`;
  }

  return base;
}

export function buildHeaders(config: ApiConfig): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (config.authMode === 'header' && config.apiKey) {
    headers['X-goog-api-Key'] = config.apiKey;
  }

  return headers;
}

export function buildPayload(
  contents: Array<{ role?: string; parts: Array<any> }>,
  config: ApiConfig
): Record<string, any> {
  const payload: Record<string, any> = {
    contents,
  };

  const now = new Date();
  const dateFormatted = now.toLocaleDateString('vi-VN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const timeFormatted = now.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const currentQuarter = Math.floor(now.getMonth() / 3) + 1;

  const temporalContext = `[MỐC THỜI GIAN THỰC CỦA HỆ THỐNG]:
- Hiện tại là: ${timeFormatted}, ${dateFormatted} (Năm ${currentYear}, Quý ${currentQuarter}, Tháng ${currentMonth}).
- QUY TẮC BẮT BUỘC VỀ THỜI GIAN THỰC:
  1. Khi người dùng hỏi về thời gian ("năm nay năm bao nhiêu", "hôm nay ngày mấy", "năm nay là năm nào", v.v.), bạn PHẢI luôn luôn trả lời chính xác, trực diện theo mốc thời gian thực này (Năm ${currentYear}).
  2. Đối với câu hỏi chào hỏi, hỏi ngày giờ hoặc câu hỏi ngắn gọn: Trả lời ngắn gọn, tự nhiên, đi thẳng vào vấn đề, không trình bày dài dòng hay gượng ép các mẫu báo cáo phức tạp.
  3. Khi tra cứu hoặc tư vấn pháp luật, chính sách thuế, kế toán: Luôn lấy mốc năm hiện tại là năm ${currentYear} để xác định hiệu lực áp dụng của văn bản.`;

  let fullInstruction = (config.systemInstruction || '').trim();

  if (!fullInstruction.includes('MỐC THỜI GIAN THỰC CỦA HỆ THỐNG')) {
    fullInstruction = `${temporalContext}\n\n${fullInstruction || 'Bạn là một trợ lý AI thông minh.'}`;
  }

  const followUpRule =
    '\n\nQUY TẮC BẮT BUỘC Ở CUỐI MỖI CÂU TRẢ LỜI: Đối với các câu hỏi tư vấn chuyên môn, thảo luận công việc hoặc giải quyết tình huống, luôn luôn kết thúc câu trả lời bằng một danh mục chính xác từ 2 đến 3 câu hỏi gợi ý để mở rộng vấn đề theo định dạng:\n---\n### 💡 Gợi ý câu hỏi tiếp theo:\n- [Câu hỏi 1]\n- [Câu hỏi 2]\n(Đối với câu chào hỏi xã giao hoặc câu hỏi ngày giờ đơn giản, có thể trả lời trực tiếp mà không cần phần gợi ý này).';

  if (!fullInstruction.includes('Gợi ý câu hỏi tiếp theo')) {
    fullInstruction = fullInstruction + followUpRule;
  }

  if (fullInstruction) {
    payload.systemInstruction = {
      parts: [{ text: fullInstruction }],
    };
  }

  const generationConfig: Record<string, any> = {};
  if (typeof config.temperature === 'number') generationConfig.temperature = config.temperature;
  if (typeof config.topP === 'number') generationConfig.topP = config.topP;
  if (typeof config.topK === 'number' && config.topK > 0) generationConfig.topK = config.topK;
  if (typeof config.maxOutputTokens === 'number' && config.maxOutputTokens > 0) {
    generationConfig.maxOutputTokens = config.maxOutputTokens;
  }

  if (Object.keys(generationConfig).length > 0) {
    payload.generationConfig = generationConfig;
  }

  return payload;
}

export function generateCurlCommand(config: ApiConfig, body: any): string {
  const url = buildEndpointUrl({ ...config, useProxy: false });
  const headers = buildHeaders(config);

  const headerLines = Object.entries(headers)
    .map(([key, val]) => `  -H '${key}: ${val}'`)
    .join(' \\\n');

  // Deep clone and truncate long base64 for cURL display readability
  let cleanBody: any = body;
  try {
    cleanBody = JSON.parse(
      JSON.stringify(body, (_key, value) => {
        if (typeof value === 'string' && value.length > 200 && /^[A-Za-z0-9+/=]+$/.test(value)) {
          return `${value.slice(0, 40)}...[${value.length} bytes base64]...${value.slice(-20)}`;
        }
        return value;
      })
    );
  } catch {
    cleanBody = body;
  }

  const jsonBody = JSON.stringify(cleanBody, null, 2);

  return `curl "${url}" \\\n${headerLines} \\\n  -X POST \\\n  -d '${jsonBody}'`;
}

export async function sendGeminiRequest(
  config: ApiConfig,
  body: any,
  options?: { signal?: AbortSignal; timeoutMs?: number }
): Promise<ApiResponseData> {
  const url = buildEndpointUrl(config);
  const headers = buildHeaders(config);
  const startTime = performance.now();
  const timeoutMs = options?.timeoutMs || 60000;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(new Error('TIMEOUT')), timeoutMs);

  if (options?.signal) {
    options.signal.addEventListener('abort', () => controller.abort(options.signal?.reason));
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: typeof body === 'string' ? body : JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const endTime = performance.now();
    const latencyMs = Math.round(endTime - startTime);

    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((val, key) => {
      responseHeaders[key] = val;
    });

    const rawText = await response.text();
    let data: any = null;
    try {
      data = JSON.parse(rawText);
    } catch {
      data = rawText;
    }

    if (!response.ok) {
      let friendlyError = '';
      if (response.status === 404) {
        friendlyError = `Model "${config.model}" không tìm thấy trên phiên bản ${config.apiVersion}. Hãy thử đổi sang gemini-flash-lite-latest hoặc gemini-3.6-flash.`;
      } else if (response.status === 400 && typeof data === 'object' && data?.error?.message?.includes('location')) {
        friendlyError = 'Vị trí mạng/IP hiện tại không được Google hỗ trợ trực tiếp. Bạn hãy bật VPN hoặc bật chế độ "Local Proxy" trên thanh cấu hình.';
      } else if (response.status === 401 || response.status === 403) {
        friendlyError = 'API Key không hợp lệ hoặc không có quyền truy cập endpoint này.';
      } else if (response.status === 504 || response.status === 502) {
        friendlyError = 'Proxy server quá thời gian chờ (Gateway Timeout). Bạn nên tắt chế độ "Local Proxy" để gọi trực tiếp tới Google nhanh hơn.';
      }

      return {
        success: false,
        status: response.status,
        statusText: response.statusText,
        latencyMs,
        data,
        error: friendlyError || data?.error?.message || response.statusText,
        headers: responseHeaders,
        rawResponse: rawText,
      };
    }

    const finishReason = data?.candidates?.[0]?.finishReason;

    return {
      success: true,
      status: response.status,
      statusText: response.statusText,
      latencyMs,
      finishReason,
      data,
      headers: responseHeaders,
      rawResponse: rawText,
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    const endTime = performance.now();
    const latencyMs = Math.round(endTime - startTime);

    let errorMsg = err?.message || 'Network request failed';
    if (err?.name === 'AbortError' || err?.message === 'TIMEOUT' || controller.signal.aborted) {
      if (err?.message === 'TIMEOUT') {
        errorMsg = `Quá thời gian chờ phản hồi (${Math.round(timeoutMs / 1000)}s). Nếu dùng Proxy, hãy thử tắt Proxy để gọi trực tiếp.`;
      } else {
        errorMsg = 'Yêu cầu đã được dừng bởi người dùng.';
      }
    } else if (err?.name === 'TypeError' && err?.message?.includes('fetch')) {
      errorMsg = 'Lỗi kết nối mạng (CORS hoặc Firewall). Bạn hãy kiểm tra lại kết nối mạng hoặc thử bật/tắt chế độ "Local Proxy".';
    }

    return {
      success: false,
      status: 0,
      statusText: controller.signal.aborted ? 'Aborted' : 'Network / Client Error',
      latencyMs,
      error: errorMsg,
      headers: {},
      rawResponse: '',
    };
  }
}

export async function sendGeminiStreamingRequest(
  config: ApiConfig,
  body: any,
  onChunk: (accumulatedText: string, latestChunk: string) => void,
  options?: { signal?: AbortSignal; timeoutMs?: number }
): Promise<ApiResponseData> {
  const url = buildEndpointUrl(config, 'streamGenerateContent');
  const headers = buildHeaders(config);
  const startTime = performance.now();
  const timeoutMs = options?.timeoutMs || 90000; // 90s cho tài liệu lớn/multi-turn

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(new Error('TIMEOUT')), timeoutMs);

  if (options?.signal) {
    options.signal.addEventListener('abort', () => controller.abort(options.signal?.reason));
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: typeof body === 'string' ? body : JSON.stringify(body),
      signal: controller.signal,
    });

    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((val, key) => {
      responseHeaders[key] = val;
    });

    if (!response.ok) {
      clearTimeout(timeoutId);
      const rawText = await response.text();
      let data: any = null;
      try {
        data = JSON.parse(rawText);
      } catch {
        data = rawText;
      }

      let friendlyError = '';
      if (response.status === 404) {
        friendlyError = `Model "${config.model}" không tìm thấy trên phiên bản ${config.apiVersion}. Hãy thử đổi sang gemini-flash-lite-latest hoặc gemini-3.6-flash.`;
      } else if (response.status === 400 && typeof data === 'object' && data?.error?.message?.includes('location')) {
        friendlyError = 'Vị trí mạng/IP hiện tại không được Google hỗ trợ trực tiếp. Hãy bật chế độ "Local Proxy" trên thanh cấu hình.';
      } else if (response.status === 401 || response.status === 403) {
        friendlyError = 'API Key không hợp lệ hoặc không có quyền truy cập endpoint này.';
      } else if (response.status === 504 || response.status === 502) {
        friendlyError = 'Proxy server quá thời gian chờ (Gateway Timeout). Bạn nên tắt chế độ "Local Proxy" để gọi trực tiếp tới Google nhanh hơn.';
      }

      return {
        success: false,
        status: response.status,
        statusText: response.statusText,
        latencyMs: Math.round(performance.now() - startTime),
        data,
        error: friendlyError || data?.error?.message || response.statusText,
        headers: responseHeaders,
        rawResponse: rawText,
      };
    }

    if (!response.body) {
      clearTimeout(timeoutId);
      throw new Error('Response body stream is not available');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let accumulatedText = '';
    let buffer = '';
    let lastData: any = null;
    let fullRaw = '';

    const processJsonPayload = (jsonStr: string) => {
      if (!jsonStr) return;
      try {
        const parsed = JSON.parse(jsonStr);
        lastData = parsed;

        // Check if SSE emitted an error payload
        if (parsed.error) {
          throw new Error(parsed.error.message || `Lỗi API SSE (${parsed.error.code || 400})`);
        }

        // Loop over ALL candidates and ALL parts
        if (parsed.candidates && Array.isArray(parsed.candidates)) {
          for (const candidate of parsed.candidates) {
            if (candidate.content?.parts && Array.isArray(candidate.content.parts)) {
              for (const part of candidate.content.parts) {
                if (typeof part.text === 'string' && part.text.length > 0) {
                  accumulatedText += part.text;
                  onChunk(accumulatedText, part.text);
                }
              }
            }
          }
        }
      } catch (e: any) {
        if (e?.message?.includes('Lỗi API SSE')) {
          throw e;
        }
        // ignore partial JSON parse errors
      }
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      fullRaw += chunk;
      buffer += chunk;

      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data:')) {
          const jsonStr = trimmed.slice(5).trim();
          processJsonPayload(jsonStr);
        }
      }
    }

    // Flush any remaining buffer data
    if (buffer.trim().startsWith('data:')) {
      const jsonStr = buffer.trim().slice(5).trim();
      processJsonPayload(jsonStr);
    }

    clearTimeout(timeoutId);

    // If accumulated text is empty, check reason
    if (!accumulatedText && lastData?.candidates?.[0]) {
      const finishReason = lastData.candidates[0].finishReason;
      if (finishReason && finishReason !== 'STOP') {
        accumulatedText = `[Mô hình kết thúc với lý do: ${finishReason}]`;
        onChunk(accumulatedText, accumulatedText);
      }
    }

    const totalLatency = Math.round(performance.now() - startTime);
    const finishReason = lastData?.candidates?.[0]?.finishReason;

    return {
      success: true,
      status: response.status,
      statusText: response.statusText,
      latencyMs: totalLatency,
      finishReason,
      data: lastData || { candidates: [{ content: { parts: [{ text: accumulatedText }] } }] },
      headers: responseHeaders,
      rawResponse: fullRaw,
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    let errorMsg = err?.message || 'Lỗi kết nối streaming';
    const isAborted = err?.name === 'AbortError' || err?.message === 'TIMEOUT' || controller.signal.aborted;

    if (isAborted) {
      if (err?.message === 'TIMEOUT') {
        errorMsg = `Quá thời gian chờ phản hồi (${Math.round(timeoutMs / 1000)}s). Vui lòng thử lại hoặc chuyển sang chế độ Gọi trực tiếp.`;
      } else {
        errorMsg = 'Yêu cầu đã được dừng bởi người dùng.';
      }
    }

    return {
      success: false,
      status: isAborted ? 0 : 500,
      statusText: isAborted ? 'Aborted' : 'Streaming Client Error',
      latencyMs: Math.round(performance.now() - startTime),
      error: errorMsg,
      headers: {},
      rawResponse: '',
    };
  }
}

export function extractResponseText(data: any): string {
  if (!data) return '';
  if (typeof data === 'string') return data;

  if (data.candidates && data.candidates.length > 0) {
    const candidate = data.candidates[0];
    if (candidate.content && candidate.content.parts) {
      return candidate.content.parts
        .map((p: any) => p.text || '')
        .join('\n')
        .trim();
    }
  }

  if (data.error && data.error.message) {
    return `[Lỗi API ${data.error.code || ''}]: ${data.error.message}`;
  }

  return JSON.stringify(data, null, 2);
}

export function extractTokenUsage(data: any) {
  if (!data || !data.usageMetadata) return undefined;
  return {
    promptTokens: data.usageMetadata.promptTokenCount,
    candidatesTokens: data.usageMetadata.candidatesTokenCount,
    totalTokens: data.usageMetadata.totalTokenCount,
  };
}
