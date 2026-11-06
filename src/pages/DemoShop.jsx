import React from "react";
import { useApp } from "../context";
import { money, date } from "../api";
import { DataState, Empty, Form, Icon, useData } from "../components";
import { ProductImage } from "./Catalog";
import "./demo-shop.css";

export function DemoShop() {
  const { boot, version, mutate, setModal, navigate, setToast } = useApp();
  const clickId = new URLSearchParams(location.search).get("click");
  const state = useData(
    boot.user && clickId
      ? `/demo/checkout?clickId=${encodeURIComponent(clickId)}`
      : null,
    version,
  );
  return (
    <section className="panel demo-checkout">
      <div className="checkout-heading">
        <h1>Mua thử sản phẩm</h1>
        <span>Đơn hàng mô phỏng</span>
      </div>
      <p className="checkout-intro">
        Trải nghiệm mua hàng và nhận hoàn tiền trong bản demo Lá
      </p>
      {!boot.user ? (
        <button className="button primary" onClick={() => setModal("auth")}>
          Đăng nhập để thử
        </button>
      ) : !clickId ? (
        <Empty title="Chưa có sản phẩm để mua thử">
          Dán link sản phẩm ở Trang chủ để bắt đầu.
        </Empty>
      ) : (
        <DataState state={state}>
          {({ click, product, scenario }) => (
            <>
              <div className="checkout-product">
                <div className="checkout-image">
                  <ProductImage key={product?.image} product={product || {}} />
                </div>
                <div className="checkout-description">
                  <p className="checkout-shop">
                    {product?.shopName || "Sản phẩm từ link của bạn"}
                  </p>
                  <p className="checkout-product-name">
                    {product?.title || scenario.title}
                  </p>
                  <p className="checkout-price">
                    {money(product?.price ?? scenario.orderValue)}
                  </p>
                  <p className="catalog-note">
                    {product?.price == null
                      ? "Giá trị dùng cho kịch bản demo"
                      : "Giá tham khảo tại thời điểm tạo link"}
                  </p>
                  {product && (
                    <p className="catalog-note">
                      Thông tin đã lưu {date(product.fetchedAt)}
                    </p>
                  )}
                  <a
                    className="text-button"
                    href={click.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Xem sản phẩm trên Shopee <Icon name="external" size={16} />
                  </a>
                </div>
              </div>
              {!product && (
                <p className="checkout-notice">
                  Chưa tải được ảnh và thông tin từ nguồn sản phẩm. Kịch bản
                  demo dùng số tiền minh họa bên dưới.
                </p>
              )}
              <section
                className="checkout-summary"
                aria-label="Tóm tắt đơn hàng mô phỏng"
              >
                <h2>Tóm tắt đơn demo</h2>
                <dl>
                  <div>
                    <dt>Số lượng</dt>
                    <dd>1 sản phẩm</dd>
                  </div>
                  <div>
                    <dt>Giá trị đơn mô phỏng</dt>
                    <dd>{money(scenario.orderValue)}</dd>
                  </div>
                  <div>
                    <dt>Hoa hồng dùng cho demo</dt>
                    <dd>{money(scenario.commission)}</dd>
                  </div>
                  <div className="checkout-cashback">
                    <dt>Tiền hoàn mô phỏng dự kiến</dt>
                    <dd>{money(scenario.cashback)}</dd>
                  </div>
                </dl>
                <p className="catalog-note">
                  Áp dụng chính sách v{click.policyVersion} · Khoản hoàn chờ
                  quản trị viên đối soát
                </p>
              </section>
              <p className="checkout-notice">
                Thao tác này chỉ tạo đơn thử trong Lá, không đặt hàng trên
                Shopee và không sử dụng tiền thật.
              </p>
              <Form
                submitLabel={
                  scenario.alreadyRecorded
                    ? "Xem đơn demo đã ghi nhận"
                    : "Mô phỏng mua & ghi nhận đơn chờ duyệt"
                }
                onSubmit={async () => {
                  const result = await mutate("/demo/order", { clickId });
                  setToast(
                    result.duplicate
                      ? "Đơn demo này đã được ghi nhận trước đó."
                      : "Đã ghi nhận đơn demo, chờ quản trị đối soát.",
                  );
                  navigate("orders");
                }}
              >
                <p className="catalog-note">
                  Gửi lại không tạo trùng đơn hoặc tiền hoàn.
                </p>
              </Form>
            </>
          )}
        </DataState>
      )}
      <button className="text-button spaced" onClick={() => navigate("home")}>
        Trở về Trang chủ <Icon name="arrow" size={16} />
      </button>
    </section>
  );
}
