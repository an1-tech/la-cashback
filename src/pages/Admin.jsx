import React, { useRef, useState } from "react";
import { useApp } from "../context";
import { money, date } from "../api";
import {
  Icon,
  Badge,
  Empty,
  DataState,
  useData,
  Form,
  Field,
  Modal,
} from "../components";
const sections = [
  ["overview", "Tổng quan"],
  ["orders", "Đơn & đối soát"],
  ["withdrawals", "Rút tiền"],
  ["policies", "Chính sách"],
  ["users", "Người dùng"],
  ["content", "Nội dung & ưu đãi"],
  ["support", "Hỗ trợ"],
  ["audit", "Nhật ký"],
];
export function Admin() {
  const { version, refresh, notifyError } = useApp();
  const [tab, setTab] = useState("overview");
  const state = useData("/admin/overview", `${version}:${tab}`);
  return (
    <>
      <div className="admin-warning">
        <Icon name="shield" />
        <div>
          <strong>Khu vực quản trị demo</strong>
          <span>
            Mọi đối soát và thanh toán ở đây đều là mô phỏng. Thao tác có nhật
            ký truy vết.
          </span>
        </div>
        <button className="button compact" onClick={notifyError(refresh)}>
          <Icon name="refresh" size={15} />
          Làm mới
        </button>
      </div>
      <div className="tabs admin-tabs">
        {sections.map(([key, label]) => (
          <button
            key={key}
            className={tab === key ? "active" : ""}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>
      <DataState state={state}>
        {(data) =>
          tab === "overview" ? (
            <Overview data={data} setTab={setTab} />
          ) : tab === "orders" ? (
            <Reconcile data={data} />
          ) : tab === "withdrawals" ? (
            <Withdrawals data={data} />
          ) : tab === "policies" ? (
            <Policies data={data} />
          ) : tab === "users" ? (
            <Users data={data} />
          ) : tab === "content" ? (
            <Content data={data} />
          ) : tab === "support" ? (
            <Support data={data} />
          ) : (
            <Audit data={data} />
          )
        }
      </DataState>
    </>
  );
}
function Overview({ data, setTab }) {
  return (
    <>
      <div className="admin-stats">
        {[
          ["users", "Người dùng", "user"],
          ["clicks", "Lượt theo dõi", "link"],
          ["orders", "Đơn ghi nhận", "bag"],
          ["commission", "Hoa hồng đã duyệt", "check"],
          ["payable", "Tiền hoàn phải trả", "wallet"],
          ["withdrawals", "Yêu cầu rút cần xử lý", "clock"],
        ].map(([key, label, icon]) => (
          <div className="balance-card" key={key}>
            <div>
              <Icon name={icon} />
              <span>{label}</span>
            </div>
            <strong>
              {["commission", "payable"].includes(key)
                ? money(data.stats[key])
                : data.stats[key]}
            </strong>
          </div>
        ))}
      </div>
      <div className="two-column">
        <div className="panel">
          <h2>Hành trình demo</h2>
          <ol className="plain-list">
            <li>Đăng nhập người mua, dán link Shopee và tạo lượt bấm.</li>
            <li>Tại cửa hàng mô phỏng, tạo đơn chờ duyệt.</li>
            <li>
              Đăng nhập quản trị, vào Đơn & đối soát để duyệt hoặc từ chối.
            </li>
            <li>Người mua gửi yêu cầu rút từ số dư khả dụng.</li>
            <li>
              Quản trị duyệt rút, sau đó ghi nhận thanh toán với mã DEMO-.
            </li>
          </ol>
        </div>
        <div className="panel">
          <h2>Cần kiểm tra</h2>
          <div className="attention-row">
            <span>Báo cáo chưa xác định người mua</span>
            <strong>{data.unmatched.length}</strong>
          </div>
          <div className="attention-row">
            <span>Yêu cầu hỗ trợ còn mở</span>
            <strong>
              {data.tickets.filter((t) => t.status === "open").length}
            </strong>
          </div>
          <div className="attention-row">
            <span>Đơn chờ duyệt</span>
            <strong>
              {data.orders.filter((o) => o.status === "pending").length}
            </strong>
          </div>
          <button
            className="button primary spaced"
            onClick={() => setTab("orders")}
          >
            Mở đối soát <Icon name="arrow" size={16} />
          </button>
        </div>
      </div>
    </>
  );
}
function Reconcile({ data }) {
  const { mutate, setToast } = useApp();
  const [selected, setSelected] = useState(null),
    [results, setResults] = useState(null),
    [unmatched, setUnmatched] = useState(null);
  const event = useRef(crypto.randomUUID());
  const click = data.clicks[0];
  const sample = JSON.stringify(
    [
      {
        eventId: "DEMO-import-" + crypto.randomUUID().slice(0, 8),
        externalId: "DEMO-IMPORT-001",
        itemId: "1",
        clickId: click?.id || "CHUA-XAC-DINH",
        title: "Sản phẩm từ báo cáo demo",
        orderValue: 500000,
        commission: 30000,
        status: "pending",
      },
    ],
    null,
    2,
  );
  return (
    <>
      <div className="panel table-wrap">
        <table>
          <thead>
            <tr>
              <th>Đơn / sản phẩm</th>
              <th>Người mua</th>
              <th>Hoa hồng</th>
              <th>Tiền hoàn</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {data.orders.map((o) => (
              <tr key={o.id}>
                <td>
                  <strong>{o.title}</strong>
                  <small className="mono">
                    {o.external_id} / {o.item_id}
                  </small>
                  <small>Chính sách v{o.version}</small>
                </td>
                <td>{o.email}</td>
                <td>{money(o.commission)}</td>
                <td>{money(o.cashback)}</td>
                <td>
                  <Badge status={o.status} />
                </td>
                <td>
                  <button
                    className="button compact"
                    onClick={() => {
                      event.current = crypto.randomUUID();
                      setSelected(o);
                    }}
                  >
                    Đối soát
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!data.orders.length && <Empty title="Chưa có đơn để đối soát" />}
      </div>
      <div className="two-column section">
        <section className="panel">
          <h2>Nhập báo cáo JSON nội bộ</h2>
          <p className="muted">
            Schema chuẩn hóa cho demo, không phải định dạng chính thức Shopee.
            Mỗi dòng có transaction riêng; chống trùng theo eventId và mã
            đơn/sản phẩm.
          </p>
          <Form
            submitLabel="Kiểm tra & nhập báo cáo"
            onSubmit={async (v) => {
              let rows;
              try {
                rows = JSON.parse(v.report);
              } catch {
                throw new Error(
                  "JSON không hợp lệ. Cần mảng các dòng báo cáo.",
                );
              }
              const result = await mutate("/admin/reports", { rows });
              setResults(result.results);
            }}
          >
            <Field label="Mảng JSON">
              <textarea
                name="report"
                className="code-input"
                rows={13}
                defaultValue={sample}
                required
              />
            </Field>
            <Field label="Hoặc đọc tệp .json (chỉ nạp vào ô, chưa nhập)">
              <input
                type="file"
                accept=".json,application/json"
                onChange={async (e) => {
                  const f = e.target.files[0];
                  if (!f) return;
                  if (f.size > 524288) {
                    setToast("Tệp tối đa 512 KB.");
                    return;
                  }
                  e.target.form.elements.report.value = await f.text();
                }}
              />
            </Field>
          </Form>
          {results && (
            <div className="import-results" role="status">
              {results.map((r) => (
                <div
                  key={r.line}
                  className={"alert " + (r.error ? "error" : "success")}
                >
                  Dòng {r.line}:{" "}
                  {r.error ||
                    (r.duplicate
                      ? "Đã nhập trước đó, không cộng trùng."
                      : r.state === "unmatched"
                        ? "Chưa gán người dùng. Chờ đối chiếu."
                        : "Đã xử lý.")}{" "}
                  {r.orderId && <small className="mono">{r.orderId}</small>}
                </div>
              ))}
            </div>
          )}
        </section>
        <section className="panel">
          <h2>
            Chưa xác định người mua <Badge>{data.unmatched.length}</Badge>
          </h2>
          <p className="muted">
            Chỉ gán sau khi có mã theo dõi và bằng chứng đối chiếu; không đoán
            từ tên hoặc giá trị đơn.
          </p>
          {data.unmatched.length ? (
            data.unmatched.map((ev) => {
              const p = JSON.parse(ev.payload);
              return (
                <div className="unmatched-row" key={ev.event_id}>
                  <b>
                    {p.externalId} / {p.itemId}
                  </b>
                  <small className="mono">{ev.event_id}</small>
                  <p>
                    {p.title} · {money(p.commission)}
                  </p>
                  <button
                    className="button compact"
                    onClick={() => setUnmatched(ev)}
                  >
                    Đối chiếu mã theo dõi
                  </button>
                </div>
              );
            })
          ) : (
            <Empty title="Không có báo cáo chưa gán" icon="check" />
          )}
          <details>
            <summary className="text-button">
              Danh sách mã theo dõi demo
            </summary>
            <div className="click-list">
              {data.clicks.map((c) => (
                <p key={c.id}>
                  <b>{c.email}</b>
                  <code>{c.id}</code>
                  <small>{date(c.created_at)}</small>
                </p>
              ))}
            </div>
          </details>
        </section>
      </div>
      {selected && (
        <Modal
          title="Đối soát hoa hồng mô phỏng"
          onClose={() => setSelected(null)}
        >
          <h3>{selected.title}</h3>
          <p className="muted">
            Chính sách v{selected.version}. Bản ghi mới sẽ tạo bút toán chênh
            lệch; không xóa lịch sử cũ.
          </p>
          <Form
            submitLabel="Ghi nhận kết quả đối soát"
            onSubmit={async (v) => {
              await mutate("/admin/reconcile", {
                orderId: selected.id,
                eventId: event.current,
                commission: Number(v.commission),
                status: v.status,
                reason: v.reason,
              });
              setSelected(null);
              setToast("Đã đối soát và ghi sổ.");
            }}
          >
            <Field label="Kết quả">
              <select name="status" required>
                <option value="approved">Hoa hồng hợp lệ — duyệt</option>
                <option value="rejected">
                  Hoa hồng không hợp lệ — từ chối
                </option>
              </select>
            </Field>
            <Field
              label="Hoa hồng do nguồn xác nhận (VND)"
              type="number"
              min="0"
              step="1"
              name="commission"
              defaultValue={selected.commission}
              required
            />
            <Field label="Lý do (bắt buộc khi từ chối)">
              <textarea name="reason" rows={3} maxLength={500} />
            </Field>
            <p className="microcopy mono">Sự kiện: {event.current}</p>
          </Form>
        </Modal>
      )}
      {unmatched && (
        <Modal
          title="Gán báo cáo bằng mã theo dõi"
          onClose={() => setUnmatched(null)}
        >
          <Form
            submitLabel="Xác nhận đối chiếu"
            onSubmit={async (v) => {
              await mutate("/admin/resolve", {
                ...v,
                eventId: unmatched.event_id,
              });
              setUnmatched(null);
              setToast("Đã gán và ghi sổ theo báo cáo.");
            }}
          >
            <Field label="Mã lượt bấm đã xác minh" name="clickId" required />
            <Field label="Bằng chứng / lý do đối chiếu">
              <textarea name="reason" rows={4} minLength={10} required />
            </Field>
          </Form>
        </Modal>
      )}
    </>
  );
}
function Withdrawals({ data }) {
  const { mutate, setToast } = useApp();
  const [selected, setSelected] = useState(null);
  return (
    <>
      <div className="alert">
        Hai bước tách biệt: duyệt yêu cầu → ghi nhận thanh toán mô phỏng. Thất
        bại hoặc từ chối sẽ giải phóng số tiền đang giữ.
      </div>
      <div className="panel table-wrap">
        <table>
          <thead>
            <tr>
              <th>Người mua / Tham chiếu</th>
              <th>Số tiền</th>
              <th>Ngân hàng giả</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {data.withdrawals.map((w) => {
              const bank = JSON.parse(w.bank_snapshot);
              return (
                <tr key={w.id}>
                  <td>
                    {w.email}
                    <small className="mono">{w.id}</small>
                    <small>{date(w.created_at)}</small>
                  </td>
                  <td>
                    <b>{money(w.amount)}</b>
                  </td>
                  <td>
                    {bank.label}
                    <small>•••• {bank.account.slice(-4)}</small>
                  </td>
                  <td>
                    <Badge status={w.status} />
                    <small>{w.payment_reference || w.reason}</small>
                  </td>
                  <td>
                    {["requested", "approved"].includes(w.status) ? (
                      <button
                        className="button compact"
                        onClick={() => setSelected(w)}
                      >
                        Xử lý
                      </button>
                    ) : (
                      "Hoàn tất"
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!data.withdrawals.length && (
          <Empty title="Chưa có yêu cầu rút" icon="wallet" />
        )}
      </div>
      {selected && (
        <Modal title="Xử lý yêu cầu rút demo" onClose={() => setSelected(null)}>
          <h3>
            {money(selected.amount)} · {selected.email}
          </h3>
          <Form
            submitLabel="Cập nhật yêu cầu"
            onSubmit={async (v) => {
              await mutate("/admin/withdrawals", { ...v, id: selected.id });
              setSelected(null);
              setToast("Đã cập nhật yêu cầu rút.");
            }}
          >
            <Field label="Thao tác">
              <select name="action">
                {selected.status === "requested" ? (
                  <>
                    <option value="approved">Duyệt — chưa thanh toán</option>
                    <option value="rejected">Từ chối — giải phóng tiền</option>
                  </>
                ) : (
                  <>
                    <option value="paid">
                      Ghi nhận đã thanh toán mô phỏng
                    </option>
                    <option value="failed">
                      Thanh toán thất bại — giải phóng tiền
                    </option>
                  </>
                )}
              </select>
            </Field>
            {selected.status === "approved" && (
              <Field
                label="Mã thanh toán (bắt đầu bằng DEMO-)"
                name="reference"
                placeholder="DEMO-TRANSFER-0001"
                maxLength={100}
              />
            )}
            <Field label="Lý do (cần khi từ chối/thất bại)">
              <textarea name="reason" rows={3} maxLength={500} />
            </Field>
          </Form>
        </Modal>
      )}
    </>
  );
}
function Policies({ data }) {
  const { mutate, setToast } = useApp();
  return (
    <div className="two-column">
      <section className="panel">
        <h2>Tạo phiên bản chính sách</h2>
        <p className="muted">
          Phạm vi MVP: toàn bộ giao dịch Shopee. Chính sách được chốt tại thời
          điểm tạo lượt theo dõi; không sửa quyền lợi của lượt bấm cũ.
        </p>
        <Form
          submitLabel="Tạo chính sách mới"
          onSubmit={async (v) => {
            await mutate("/admin/policies", {
              shareBps: Number(v.shareBps),
              holdDays: Number(v.holdDays),
              minimumWithdrawal: Number(v.minimumWithdrawal),
              effectiveAt: new Date(v.effectiveAt).toISOString(),
            });
            setToast("Đã thêm phiên bản chính sách.");
          }}
        >
          <Field
            label="Phần hoa hồng chia cho người mua (basis points)"
            name="shareBps"
            type="number"
            min="0"
            max="10000"
            step="1"
            defaultValue="7000"
            required
          />
          <p className="microcopy">
            7000 = 70% hoa hồng hợp lệ, không phải 70% giá sản phẩm.
          </p>
          <Field
            label="Ngày chờ khả dụng sau khi duyệt"
            name="holdDays"
            type="number"
            min="0"
            max="365"
            step="1"
            defaultValue="0"
            required
          />
          <Field
            label="Mức rút tối thiểu (VND)"
            name="minimumWithdrawal"
            type="number"
            min="1000"
            step="1"
            defaultValue="50000"
            required
          />
          <Field
            label="Hiệu lực từ (giờ địa phương)"
            name="effectiveAt"
            type="datetime-local"
            defaultValue={localTime()}
            required
          />
        </Form>
      </section>
      <section className="panel">
        <h2>Lịch sử chính sách</h2>
        {data.policies.map((p) => (
          <article className="policy-row" key={p.id}>
            <div className="section-heading">
              <h3>Phiên bản {p.version}</h3>
              <Badge>
                {new Date(p.effective_at) > new Date()
                  ? "Đã lên lịch"
                  : "Đã có hiệu lực"}
              </Badge>
            </div>
            <p>
              Chia <b>{p.share_bps / 100}%</b> hoa hồng · Chờ{" "}
              <b>{p.hold_days} ngày</b>
            </p>
            <p>
              Rút tối thiểu: <b>{money(p.minimum_withdrawal)}</b>
            </p>
            <small>
              Từ {date(p.effective_at)} · Phạm vi {p.scope}
            </small>
          </article>
        ))}
      </section>
    </div>
  );
}
function Users({ data }) {
  const { mutate, setToast } = useApp();
  const [selected, setSelected] = useState(null);
  const reference = useRef("");
  return (
    <>
      <div className="table-wrap panel">
        <table>
          <thead>
            <tr>
              <th>Người dùng</th>
              <th>Vai trò</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {data.users.map((u) => (
              <tr key={u.id}>
                <td>
                  <b>{u.name}</b>
                  <small>{u.email}</small>
                  <small className="mono">{u.id}</small>
                </td>
                <td>{u.role}</td>
                <td>
                  <Badge>
                    {u.status === "active" ? "Hoạt động" : "Đã khóa"}
                  </Badge>
                </td>
                <td>
                  <div className="inline-actions">
                    {u.role === "user" && (
                      <button
                        className="button compact"
                        onClick={async () => {
                          try {
                            await mutate(
                              "/admin/users",
                              {
                                id: u.id,
                                status:
                                  u.status === "active" ? "blocked" : "active",
                              },
                              "PATCH",
                            );
                            setToast("Đã cập nhật trạng thái tài khoản.");
                          } catch (e) {
                            setToast(e.message);
                          }
                        }}
                      >
                        {u.status === "active" ? "Khóa" : "Mở khóa"}
                      </button>
                    )}
                    <button
                      className="button compact"
                      onClick={() => {
                        reference.current = "DEMO-ADJ-" + crypto.randomUUID();
                        setSelected(u);
                      }}
                    >
                      Điều chỉnh sổ tiền
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {selected && (
        <Modal
          title="Điều chỉnh số dư có truy vết"
          onClose={() => setSelected(null)}
        >
          <p>{selected.email}</p>
          <div className="alert">
            Tạo bút toán mới vào số dư khả dụng. Số âm là thu hồi, số dương là
            bổ sung; cần lý do đối soát.
          </div>
          <Form
            submitLabel="Ghi bút toán điều chỉnh demo"
            onSubmit={async (v) => {
              await mutate("/admin/adjustments", {
                userId: selected.id,
                amount: Number(v.amount),
                reason: v.reason,
                reference: reference.current,
              });
              setSelected(null);
              setToast("Đã ghi điều chỉnh và nhật ký.");
            }}
          >
            <Field
              label="Số tiền điều chỉnh có dấu (VND)"
              name="amount"
              type="number"
              step="1"
              min="-1000000000"
              max="1000000000"
              required
            />
            <Field label="Lý do / bằng chứng">
              <textarea name="reason" rows={4} required minLength={10} />
            </Field>
            <p className="mono microcopy">{reference.current}</p>
          </Form>
        </Modal>
      )}
    </>
  );
}
function Content({ data }) {
  const { mutate, setToast } = useApp();
  const [editing, setEditing] = useState(null);
  return (
    <>
      <div className="two-column">
        <section className="panel">
          <h2>Banner & hướng dẫn</h2>
          <Form onSubmit={(v) => mutate("/admin/content", v, "PUT")}>
            <Field
              label="Nội dung banner"
              name="banner"
              defaultValue={data.content.banner}
              required
              maxLength={160}
            />
            <Field label="Hướng dẫn">
              <textarea
                name="guide"
                rows={5}
                defaultValue={data.content.guide}
                required
                maxLength={1500}
              />
            </Field>
          </Form>
        </section>
        <section className="panel">
          <h2>Deal & voucher</h2>
          <p className="muted">
            Chỉ đăng ưu đãi minh họa trong phiên bản demo. Không tự tạo mức hoàn
            tiền cho sản phẩm.
          </p>
          <button className="button primary" onClick={() => setEditing({})}>
            Thêm ưu đãi mới <Icon name="gift" size={16} />
          </button>
          {data.deals.map((d) => (
            <div className="attention-row" key={d.id}>
              <span>
                {d.title}
                <small>
                  {d.active ? "Đang bật" : "Đã ẩn"} · {date(d.expires_at)}
                </small>
              </span>
              <button className="button compact" onClick={() => setEditing(d)}>
                Sửa
              </button>
            </div>
          ))}
        </section>
      </div>
      {editing && (
        <Modal
          title={editing.id ? "Chỉnh sửa ưu đãi" : "Thêm ưu đãi mô phỏng"}
          onClose={() => setEditing(null)}
        >
          <Form
            onSubmit={async (v) => {
              await mutate("/admin/deals", {
                ...v,
                id: editing.id,
                expiresAt: new Date(v.expiresAt).toISOString(),
                active: v.active === "true",
              });
              setEditing(null);
              setToast("Đã lưu ưu đãi.");
            }}
          >
            <Field
              label="Tiêu đề"
              name="title"
              defaultValue={editing.title}
              required
            />
            <Field
              label="Danh mục"
              name="category"
              defaultValue={editing.category || "Nhà cửa"}
              required
            />
            <Field label="Mô tả">
              <textarea
                name="description"
                defaultValue={editing.description}
                required
                rows={3}
              />
            </Field>
            <Field
              label="Mã voucher minh họa"
              name="code"
              defaultValue={editing.code}
            />
            <Field
              label="Link sản phẩm Shopee"
              name="url"
              type="url"
              defaultValue={editing.url || "https://shopee.vn/demo-i.123.456"}
              required
            />
            <Field
              label="Hết hạn"
              name="expiresAt"
              type="datetime-local"
              defaultValue={localTime(
                editing.expires_at ||
                  new Date(Date.now() + 86400000).toISOString(),
              )}
              required
            />
            <Field label="Điều kiện">
              <textarea
                name="conditions"
                defaultValue={
                  editing.conditions ||
                  "Ưu đãi minh họa. Không áp dụng thực tế."
                }
                required
                rows={3}
              />
            </Field>
            <div className="form-grid">
              <Field label="Màu minh họa">
                <select name="accent" defaultValue={editing.accent || "mint"}>
                  {["mint", "peach", "lavender", "blue"].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Field>
              <Field label="Hiển thị">
                <select
                  name="active"
                  defaultValue={editing.active === 0 ? "false" : "true"}
                >
                  <option value="true">Bật</option>
                  <option value="false">Ẩn</option>
                </select>
              </Field>
            </div>
          </Form>
        </Modal>
      )}
    </>
  );
}
function Support({ data }) {
  const { mutate, setToast } = useApp();
  return data.tickets.length ? (
    <div className="order-list">
      {data.tickets.map((t) => (
        <section className="panel" key={t.id}>
          <div className="section-heading">
            <h2>{t.subject}</h2>
            <Badge status={t.status} />
          </div>
          <p>{t.message}</p>
          <small className="muted">
            {t.email} · {date(t.created_at)} · {t.order_id || "Không gắn đơn"}
          </small>
          {t.response ? (
            <div className="alert success">{t.response}</div>
          ) : (
            <Form
              submitLabel="Phản hồi & đóng yêu cầu"
              onSubmit={async (v) => {
                await mutate("/admin/tickets", { ...v, id: t.id });
                setToast("Đã lưu phản hồi cho người dùng.");
              }}
            >
              <Field label="Phản hồi">
                <textarea name="response" rows={3} required minLength={5} />
              </Field>
            </Form>
          )}
        </section>
      ))}
    </div>
  ) : (
    <Empty title="Chưa có yêu cầu hỗ trợ" icon="help" />
  );
}
function Audit({ data }) {
  return (
    <div className="table-wrap panel">
      <table>
        <thead>
          <tr>
            <th>Thời gian</th>
            <th>Người thực hiện</th>
            <th>Thao tác</th>
            <th>Tham chiếu / Chi tiết</th>
          </tr>
        </thead>
        <tbody>
          {data.audit.map((a) => (
            <tr key={a.id}>
              <td>{date(a.created_at)}</td>
              <td>{a.email}</td>
              <td>
                <code>{a.action}</code>
              </td>
              <td>
                <span className="mono">{a.reference}</span>
                <small className="mono">{a.details}</small>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!data.audit.length && <Empty title="Chưa có thao tác" />}
    </div>
  );
}
function localTime(value) {
  const d = value ? new Date(value) : new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}
