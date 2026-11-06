import React, { useState } from "react";
import { money } from "../api";
import { DataState, Empty, Icon, useData } from "../components";
import "./catalog.css";

function SourceNote({ data }) {
  return (
    <p className="catalog-note">
      Nguồn: AddLiveTag · {data.stale ? "Bản lưu cũ" : "Dữ liệu tham khảo"}
      {data.fetchedAt &&
        ` · Tra cứu ${new Date(data.fetchedAt).toLocaleString("vi-VN")}`}
      {data.warning && <span>{data.warning}</span>}
    </p>
  );
}
export function ProductImage({ product }) {
  const [failed, setFailed] = useState(false);
  return product.image && !failed ? (
    <img
      src={product.image}
      alt={product.title || "Sản phẩm Shopee"}
      width="240"
      height="240"
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  ) : (
    <div className="catalog-no-image">
      <Icon name="bag" size={30} />
      <span>Chưa có ảnh</span>
    </div>
  );
}
function PriceHistory({ itemId }) {
  const [days, setDays] = useState(90),
    [retry, setRetry] = useState(0);
  const state = useData(
    `/catalog/history?itemIds=${encodeURIComponent(itemId)}&days=${days}`,
    retry,
  );
  return (
    <section className="price-history" aria-label="Lịch sử giá tham khảo">
      <label>
        Khoảng thời gian
        <select
          value={days}
          onChange={(event) => setDays(Number(event.target.value))}
        >
          <option value={30}>30 ngày</option>
          <option value={90}>90 ngày</option>
          <option value={365}>1 năm</option>
        </select>
      </label>
      <DataState state={state}>
        {(data) => {
          const item = data.items?.[0],
            points = item?.price?.points || [];
          if (item?.status !== "success" || !points.length)
            return <Empty title="Chưa có lịch sử giá trong khoảng này" />;
          return (
            <>
              <p>
                Thấp nhất:{" "}
                <b>
                  {item.price.stats?.min == null
                    ? "Chưa có"
                    : money(item.price.stats.min)}
                </b>{" "}
                · Cao nhất:{" "}
                <b>
                  {item.price.stats?.max == null
                    ? "Chưa có"
                    : money(item.price.stats.max)}
                </b>
              </p>
              <p className="catalog-note">
                Chỉ hiển thị ngày có thay đổi · Mỗi ngày ghi nhận một mức giá,
                không phản ánh mọi biến động trong ngày
              </p>
              {data.truncated && (
                <p className="alert">
                  Lịch sử bị giới hạn số điểm. Hãy chọn khoảng thời gian ngắn
                  hơn.
                </p>
              )}
              <div
                className="price-history-table"
                tabIndex="0"
                role="region"
                aria-label="Các mốc thay đổi giá"
              >
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Ngày</th>
                      <th scope="col">Giá (VNĐ)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {points.map((point) => (
                      <tr key={point.date}>
                        <td>{point.date}</td>
                        <td>
                          {point.price == null
                            ? "Chưa có dữ liệu"
                            : money(point.price)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <SourceNote data={data} />
            </>
          );
        }}
      </DataState>
      {state.error && (
        <button className="text-button" onClick={() => setRetry((n) => n + 1)}>
          Thử tải lại lịch sử
        </button>
      )}
    </section>
  );
}
export function ProductReference({ data }) {
  const product = data.product;
  const [history, setHistory] = useState(false);
  if (!product) return null;
  return (
    <section
      className="product-reference"
      aria-label="Thông tin sản phẩm tham khảo"
    >
      <div className="product-reference-main">
        <ProductImage key={product.image} product={product} />
        <div>
          <h3>{product.title || "Chưa có tên sản phẩm"}</h3>
          {product.shopName && <p>{product.shopName}</p>}
          <p>
            Giá tham khảo:{" "}
            <strong>
              {product.price == null ? "Chưa xác định" : money(product.price)}
            </strong>
          </p>
          <p>
            Hoa hồng tham khảo:{" "}
            <b>
              {product.commission == null
                ? "Chưa xác định"
                : money(product.commission)}
            </b>
          </p>
          <p className="catalog-note">
            {data.commissionBasis === "proxy"
              ? "Tỷ lệ của tài khoản nguồn, có thể khác tài khoản của bạn"
              : "Tính theo tier do quản trị viên cấu hình"}{" "}
            · Không phải tiền hoàn của bạn
          </p>
          {product.url && (
            <a
              className="text-button"
              href={product.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Xem giá trên Shopee <Icon name="external" size={15} />
            </a>
          )}
          <p className="catalog-note">
            Link gốc mở Shopee, chưa ghi nhận affiliate hoặc đơn hàng trong Lá
          </p>
        </div>
      </div>
      <SourceNote data={data} />
      <details onToggle={(event) => setHistory(event.currentTarget.open)}>
        <summary>Lịch sử giá tham khảo</summary>
        {history && <PriceHistory itemId={product.itemId} />}
      </details>
    </section>
  );
}
