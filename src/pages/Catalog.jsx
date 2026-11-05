import React, { useState } from "react";
import { useApp } from "../context";
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
function ProductImage({ product }) {
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
export function CatalogOffers() {
  const { boot, setModal } = useApp();
  const [draft, setDraft] = useState(""),
    [keyword, setKeyword] = useState(""),
    [page, setPage] = useState(1),
    [retry, setRetry] = useState(0);
  const [selected, setSelected] = useState(null);
  const enabled = boot.catalog?.configured && boot.user;
  const state = useData(
    enabled
      ? `/catalog/offers?keyword=${encodeURIComponent(keyword)}&page=${page}&limit=20`
      : null,
    retry,
  );
  return (
    <section className="catalog-offers">
      <div className="section-heading">
        <h2>Sản phẩm tham khảo</h2>
      </div>
      <p className="catalog-note">
        Dữ liệu bên thứ ba dành cho demo học tập · Giá và hoa hồng có thể thay
        đổi · Chưa ghi nhận tiền hoàn
      </p>
      {!boot.catalog?.configured ? (
        <Empty title="Chưa kết nối nguồn dữ liệu sản phẩm">
          Các ưu đãi minh họa vẫn sử dụng được ở tab bên cạnh.
        </Empty>
      ) : !boot.user ? (
        <div className="panel">
          <p>Đăng nhập để tra cứu sản phẩm và lịch sử giá.</p>
          <button className="button primary" onClick={() => setModal("auth")}>
            Đăng nhập để tra cứu
          </button>
        </div>
      ) : (
        <>
          <form
            className="catalog-search"
            onSubmit={(event) => {
              event.preventDefault();
              setKeyword(draft.trim());
              setPage(1);
              setSelected(null);
              setRetry((n) => n + 1);
            }}
          >
            <label htmlFor="catalog-query">Tên sản phẩm</label>
            <div>
              <input
                id="catalog-query"
                value={draft}
                maxLength={100}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Ví dụ: tai nghe"
              />
              <button className="button primary">Tìm sản phẩm</button>
            </div>
          </form>
          <DataState state={state}>
            {(data) => (
              <>
                <SourceNote data={data} />
                {data.products.length ? (
                  <div className="catalog-grid">
                    {data.products.map((product, index) => (
                      <article
                        className="panel catalog-card"
                        key={`${product.itemId}-${index}`}
                      >
                        <ProductImage product={product} />
                        <h3>{product.title || "Sản phẩm chưa có tên"}</h3>
                        <p>
                          {product.price == null
                            ? "Chưa có giá"
                            : money(product.price)}
                        </p>
                        {product.ratePercent !== null && (
                          <small>
                            Hoa hồng nguồn:{" "}
                            {new Intl.NumberFormat("vi-VN", {
                              maximumFractionDigits: 2,
                            }).format(product.ratePercent)}
                            %
                          </small>
                        )}
                        <button
                          className="text-button"
                          onClick={() => setSelected({ ...product })}
                        >
                          Xem chi tiết <Icon name="arrow" size={15} />
                        </button>
                      </article>
                    ))}
                  </div>
                ) : (
                  <Empty title="Chưa tìm thấy sản phẩm phù hợp" />
                )}
                <nav
                  className="catalog-pagination"
                  aria-label="Phân trang sản phẩm"
                >
                  <button
                    className="button"
                    disabled={page === 1}
                    onClick={() => {
                      setPage(page - 1);
                      setSelected(null);
                    }}
                  >
                    Trang trước
                  </button>
                  <span>Trang {page}</span>
                  <button
                    className="button"
                    disabled={!data.hasNextPage}
                    onClick={() => {
                      setPage(page + 1);
                      setSelected(null);
                    }}
                  >
                    Trang sau
                  </button>
                </nav>
              </>
            )}
          </DataState>
          {state.error && (
            <button className="button" onClick={() => setRetry((n) => n + 1)}>
              Thử tải lại sản phẩm
            </button>
          )}
          {selected && (
            <SelectedProduct
              key={selected.itemId}
              selected={selected}
              onClose={() => setSelected(null)}
            />
          )}
        </>
      )}
    </section>
  );
}
function SelectedProduct({ selected, onClose }) {
  const [retry, setRetry] = useState(0);
  const state = useData(
    `/catalog/product?itemId=${encodeURIComponent(selected.itemId)}`,
    retry,
  );
  return (
    <section
      className="panel catalog-detail"
      aria-label="Chi tiết sản phẩm đã chọn"
    >
      <button className="button" onClick={onClose}>
        Đóng chi tiết
      </button>
      <DataState state={state}>
        {(data) => (
          <ProductReference
            data={{
              ...data,
              product: {
                ...data.product,
                url: data.product.url || selected.url,
              },
            }}
          />
        )}
      </DataState>
      {state.error && (
        <button className="text-button" onClick={() => setRetry((n) => n + 1)}>
          Thử tải lại chi tiết
        </button>
      )}
    </section>
  );
}
