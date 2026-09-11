import type { ApiConfig, ApiResponseData, GroundingMetadata, GroundingSource } from '../types';

export function buildEndpointUrl(config: ApiConfig, action = 'generateContent'): string {
  let base: string;

  // Kiểm tra môi trường: chỉ cho phép /api/gemini-proxy khi chạy thực tế trên localhost (Vite dev server)
  const isLocalhost =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname === '0.0.0.0');

  if (config.useProxy && isLocalhost) {
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
- QUY TẮC BẮT BUỘC VỀ THỜI GIAN THỰC & BẢO TOÀN SỰ THẬT PHÁP LÝ:
  1. Khi người dùng hỏi về thời gian ("năm nay năm bao nhiêu", "hôm nay ngày mấy", "năm nay là năm nào", v.v.), bạn PHẢI luôn luôn trả lời chính xác, trực diện theo mốc thời gian thực này (Năm ${currentYear}).
  2. Đối với câu hỏi chào hỏi, hỏi ngày giờ hoặc câu hỏi ngắn gọn: Trả lời ngắn gọn, tự nhiên, đi thẳng vào vấn đề, không trình bày dài dòng hay gượng ép các mẫu báo cáo phức tạp.
  3. [QUY TẮC CHỐNG ẢO GIÁC PHÁP LÝ (STRICT ANTI-HALLUCINATION)]:
     - KHO VĂN BẢN HỢP LỆ TRONG HỆ THỐNG:
       + Nghị định 123/2020/NĐ-CP & Thông tư 78/2021/TT-BTC (Quy định gốc nền tảng về hóa đơn, chứng từ điện tử; xử lý hóa đơn sai sót theo Điều 19; gửi Mẫu 04/SS-HĐĐT).
       + Nghị định 125/2020/NĐ-CP & Nghị định 102/2021/NĐ-CP (Xử phạt vi phạm hành chính về thuế, hóa đơn).
       + Nghị định 41/2022/NĐ-CP (Sửa đổi mẫu thông báo hóa đơn sai sót).
       + Nghị định 70/2025/NĐ-CP (Sửa đổi, bổ sung 40/61 điều của Nghị định 123/2020/NĐ-CP).
       + Nghị định 254/2026/NĐ-CP (Quy định chi tiết Luật Quản lý thuế số 108/2025/QH15 về hóa đơn, chứng từ điện tử - tài liệu "NĐ_254_2026_Hoa don" trong Kho tri thức).
       + Luật Quản lý thuế số 108/2025/QH15 & Luật Quản lý thuế số 38/2019/QH14.
     - ĐIỀU CẤM TUYỆT ĐỐI:
       + TUYỆT ĐỐI KHÔNG TỰ BỊA ĐẶT số hiệu Thông tư hoặc Nghị định không có thật (CẤM bịa ra "Thông tư 91/2026/TT-BTC" hoặc bất kỳ thông tư nào không có trong tài liệu). Văn bản hướng dẫn hóa đơn điện tử sai sót vẫn là Thông tư 78/2021/TT-BTC.
       + Khi người dùng hỏi văn bản mới có sửa đổi bổ sung không: Hãy đối chiếu chính xác với Nghị định 70/2025/NĐ-CP và Nghị định 254/2026/NĐ-CP (NĐ_254_2026_Hoa don) có trong kho tri thức; chỉ rõ điểm mới thực tế (chuẩn hóa dữ liệu qua Cổng TCT, máy tính tiền, sinh trắc học...), đồng thời khẳng định rõ ràng rằng bản chất quy trình xử lý hóa đơn sai sót (hóa đơn điều chỉnh/thay thế, gửi Mẫu 04/SS-HĐĐT) vẫn áp dụng kế thừa theo quy định nền tảng tại Điều 19 Nghị định 123/2020/NĐ-CP và Thông tư 78/2021/TT-BTC.`;

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

  // Google Search Grounding: Tra cứu Web qua Google (yêu cầu Google Cloud Project có liên kết Billing)
  if (config.enableSearchGrounding && config.searchProvider === 'google') {
    payload.tools = [
      {
        google_search: {},
      },
    ];
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
      const rawErrorMsg = (typeof data === 'object' ? data?.error?.message : '') || '';
      const isLocationError =
        response.status === 400 &&
        (rawErrorMsg.toLowerCase().includes('location') ||
          rawErrorMsg.toLowerCase().includes('country') ||
          (data?.error?.status === 'FAILED_PRECONDITION' &&
            (rawErrorMsg.toLowerCase().includes('user') ||
              rawErrorMsg.toLowerCase().includes('support') ||
              rawErrorMsg.toLowerCase().includes('billing') ||
              !rawErrorMsg)));

      if (response.status === 404) {
        friendlyError = `Model "${config.model}" không tìm thấy trên phiên bản ${config.apiVersion}. Hãy thử đổi sang "gemini-3.5-flash-lite" hoặc "gemini-flash-lite-latest".`;
      } else if (isLocationError) {
        friendlyError =
          'Vị trí mạng/IP hiện tại bị Google giới hạn (User location is not supported).\n\n' +
          '🔍 **Nguyên nhân chính xác:** Máy tính này đang kết nối qua phần mềm bảo mật/Proxy doanh nghiệp (như Zscaler Client Connector điều hướng mạng qua Singapore). Google AI Studio (gói miễn phí) tự động chặn IP trung tâm dữ liệu này. Trong khi đó, các thiết bị khác (điện thoại, máy cá nhân) dùng mạng gia đình/4G Việt Nam trực tiếp nên không bị chặn.\n\n' +
          '💡 **Cách khắc phục ngay:**\n' +
          '1. Nhấp đúp vào file **"Chay-App-Bypass-VPN.bat"** đã tạo sẵn trên màn hình Desktop của bạn (mở Chrome trực tiếp bỏ qua Zscaler).\n' +
          '2. Hoặc tạm **Pause/Turn Off Zscaler Internet Security** ở khay hệ thống (góc dưới bên phải gần đồng hồ).\n' +
          '3. Hoặc phát mạng 4G/5G từ điện thoại di động.';
      } else if (response.status === 401 || response.status === 403) {
        friendlyError = 'API Key không hợp lệ hoặc không có quyền truy cập endpoint này. Bạn hãy kiểm tra lại khóa API trong phần Cài đặt.';
      } else if (response.status === 504 || response.status === 502) {
        friendlyError = 'Proxy server quá thời gian chờ (Gateway Timeout). Bạn nên tắt chế độ "Local Proxy" để gọi trực tiếp tới Google nhanh hơn.';
      } else if (response.status === 429) {
        if (config.enableSearchGrounding) {
          friendlyError = 'Tính năng Google Search Grounding yêu cầu Google Cloud Project của API Key đã liên kết tài khoản thanh toán (Billing). Tài khoản miễn phí (chưa add thẻ) bị giới hạn tính năng tìm kiếm này. Bạn hãy bấm "TẮT Tra cứu Web" trên ô chat để tiếp tục trò chuyện bình thường!';
        } else {
          friendlyError = 'Đã vượt quá giới hạn tần suất gọi API (Rate Limit / Quota). Vui lòng đợi vài giây rồi thử lại.';
        }
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
      const rawErrorMsg = (typeof data === 'object' ? data?.error?.message : '') || '';
      const isLocationError =
        response.status === 400 &&
        (rawErrorMsg.toLowerCase().includes('location') ||
          rawErrorMsg.toLowerCase().includes('country') ||
          (data?.error?.status === 'FAILED_PRECONDITION' &&
            (rawErrorMsg.toLowerCase().includes('user') ||
              rawErrorMsg.toLowerCase().includes('support') ||
              rawErrorMsg.toLowerCase().includes('billing') ||
              !rawErrorMsg)));

      if (response.status === 404) {
        friendlyError = `Model "${config.model}" không tìm thấy trên phiên bản ${config.apiVersion}. Hãy thử đổi sang "gemini-3.5-flash-lite" hoặc "gemini-flash-lite-latest".`;
      } else if (isLocationError) {
        friendlyError =
          'Vị trí mạng/IP hiện tại bị Google giới hạn (User location is not supported).\n\n' +
          '🔍 **Nguyên nhân chính xác:** Máy tính này đang kết nối qua phần mềm bảo mật/Proxy doanh nghiệp (như Zscaler Client Connector điều hướng mạng qua Singapore). Google AI Studio (gói miễn phí) tự động chặn IP trung tâm dữ liệu này. Trong khi đó, các thiết bị khác (điện thoại, máy cá nhân) dùng mạng gia đình/4G Việt Nam trực tiếp nên không bị chặn.\n\n' +
          '💡 **Cách khắc phục ngay:**\n' +
          '1. Nhấp đúp vào file **"Chay-App-Bypass-VPN.bat"** đã tạo sẵn trên màn hình Desktop của bạn (mở Chrome trực tiếp bỏ qua Zscaler).\n' +
          '2. Hoặc tạm **Pause/Turn Off Zscaler Internet Security** ở khay hệ thống (góc dưới bên phải gần đồng hồ).\n' +
          '3. Hoặc phát mạng 4G/5G từ điện thoại di động.';
      } else if (response.status === 401 || response.status === 403) {
        friendlyError = 'API Key không hợp lệ hoặc không có quyền truy cập endpoint này. Bạn hãy kiểm tra lại khóa API trong phần Cài đặt.';
      } else if (response.status === 504 || response.status === 502) {
        friendlyError = 'Proxy server quá thời gian chờ (Gateway Timeout). Bạn nên tắt chế độ "Local Proxy" để gọi trực tiếp tới Google nhanh hơn.';
      } else if (response.status === 429) {
        if (config.enableSearchGrounding) {
          friendlyError = 'Tính năng Google Search Grounding yêu cầu Google Cloud Project của API Key đã liên kết tài khoản thanh toán (Billing). Tài khoản miễn phí (chưa add thẻ) bị giới hạn tính năng tìm kiếm này. Bạn hãy bấm "TẮT Tra cứu Web" trên ô chat để tiếp tục trò chuyện bình thường!';
        } else {
          friendlyError = 'Đã vượt quá giới hạn tần suất gọi API (Rate Limit / Quota). Vui lòng đợi vài giây rồi thử lại.';
        }
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
    let accumulatedGroundingMetadata: any = null;

    const processJsonPayload = (jsonStr: string) => {
      if (!jsonStr) return;
      try {
        const parsed = JSON.parse(jsonStr);
        lastData = parsed;

        // Capture groundingMetadata from chunks
        if (parsed.candidates?.[0]?.groundingMetadata) {
          accumulatedGroundingMetadata = parsed.candidates[0].groundingMetadata;
        }

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

    if (accumulatedGroundingMetadata) {
      if (!lastData) {
        lastData = {
          candidates: [
            {
              content: { parts: [{ text: accumulatedText }] },
              groundingMetadata: accumulatedGroundingMetadata,
            },
          ],
        };
      } else if (lastData.candidates?.[0]) {
        lastData.candidates[0].groundingMetadata = accumulatedGroundingMetadata;
      }
    }

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

export function extractGroundingMetadata(data: any): GroundingMetadata | undefined {
  if (!data?.candidates?.[0]?.groundingMetadata) return undefined;
  return data.candidates[0].groundingMetadata;
}

export function extractGroundingSources(metadata?: GroundingMetadata): GroundingSource[] {
  if (!metadata?.groundingChunks || !Array.isArray(metadata.groundingChunks)) return [];
  const sources: GroundingSource[] = [];
  const seenUrls = new Set<string>();

  for (const chunk of metadata.groundingChunks) {
    if (chunk.web?.uri) {
      const url = chunk.web.uri;
      if (!seenUrls.has(url)) {
        seenUrls.add(url);
        sources.push({
          title: chunk.web.title || url,
          url,
        });
      }
    }
  }
  return sources;
}
