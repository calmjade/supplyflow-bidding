import fs from 'node:fs';
import path from 'node:path';
import initSqlJs, { type Database, type SqlValue } from 'sql.js';
import type { RfqLineItem } from '@/types';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'supplyflow.sqlite');

const globalForDb = globalThis as unknown as {
  __supplyflowDbPromise?: Promise<Database>;
};

function persistDatabase(db: Database): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const exported = db.export();
  fs.writeFileSync(DB_FILE, Buffer.from(exported));
}

function initializeSchema(db: Database): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS suppliers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      grade TEXT NOT NULL,
      fulfillment_rate REAL NOT NULL,
      total_awarded_amount REAL NOT NULL,
      contact_name TEXT NOT NULL,
      contact_phone TEXT NOT NULL,
      category_focus TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS rfq_projects (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      budget_limit REAL NOT NULL,
      deadline TEXT NOT NULL,
      status TEXT NOT NULL,
      description TEXT NOT NULL,
      items_json TEXT NOT NULL,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL,
      awarded_bid_id TEXT
    );

    CREATE TABLE IF NOT EXISTS supplier_bids (
      id TEXT PRIMARY KEY,
      rfq_id TEXT NOT NULL,
      supplier_id TEXT NOT NULL,
      supplier_name TEXT NOT NULL,
      total_price REAL NOT NULL,
      lead_days INTEGER NOT NULL,
      warranty_months INTEGER NOT NULL,
      proposal_note TEXT NOT NULL,
      item_prices_json TEXT NOT NULL,
      is_winner INTEGER NOT NULL DEFAULT 0,
      submitted_at TEXT NOT NULL,
      UNIQUE(rfq_id, supplier_id)
    );
  `);
}

function seedIfEmpty(db: Database): void {
  const countRes = db.exec('SELECT COUNT(*) FROM rfq_projects');
  const count = Number(countRes[0]?.values[0]?.[0] ?? 0);
  if (count > 0) return;

  const suppliers = [
    [
      'sup-haizhi',
      '青岛海智精密制造有限公司',
      'AAA',
      98.6,
      3850000,
      '陈志远',
      '138-5320-8812',
      '智能制造装备 / 数据中心基础设施',
    ],
    [
      'sup-yunlian',
      '苏州云联工业科技有限公司',
      'AA',
      96.4,
      2140000,
      '林思雨',
      '139-6210-4459',
      '工业物联网 / 自动化产线改造',
    ],
    [
      'sup-huadong',
      '上海华东智能装备有限公司',
      'AAA',
      99.1,
      5420000,
      '周明轩',
      '136-0188-7320',
      '数控加工中心 / 绿色能源配电',
    ],
    [
      'sup-shenzhen',
      '深圳科创微电子有限公司',
      'AA',
      95.8,
      1680000,
      '黄俊杰',
      '135-1099-6615',
      '机器视觉 / 工业传感控制',
    ],
  ];

  for (const s of suppliers) {
    db.run(
      `INSERT INTO suppliers (id, name, grade, fulfillment_rate, total_awarded_amount, contact_name, contact_phone, category_focus)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      s as SqlValue[]
    );
  }

  const rfqs: Array<{
    id: string;
    title: string;
    category: string;
    budget_limit: number;
    deadline: string;
    status: string;
    description: string;
    items: RfqLineItem[];
    created_by: string;
    created_at: string;
    awarded_bid_id: string | null;
  }> = [
    {
      id: 'RFQ-2026-001',
      title: '五轴精密加工中心及自动化上下料单元集采',
      category: '智能制造装备',
      budget_limit: 1850000,
      deadline: '2026-12-18T18:00:00Z',
      status: 'OPEN',
      description:
        '用于集团华北精密制造基地二期产线扩建，要求主轴转速 ≥18,000 RPM，重复定位精度 ±0.003mm，包含现场安装调试与操作培训。',
      items: [
        {
          sku: 'CNC-5X-850',
          name: '五轴联动立式加工中心',
          spec: '工作台 Ø850mm / 西门子840D系统',
          unit: '台',
          qty: 2,
          refUnitPrice: 760000,
        },
        {
          sku: 'ROBOT-LOAD-20',
          name: '桁架机械手自动上下料单元',
          spec: '负载 20kg / 含双工位料库',
          unit: '套',
          qty: 2,
          refUnitPrice: 165000,
        },
      ],
      created_by: 'buyer-caojie',
      created_at: '2026-11-18T09:00:00Z',
      awarded_bid_id: null,
    },
    {
      id: 'RFQ-2026-002',
      title: '智慧工厂产线边缘网关与多模态传感器套件',
      category: '工业物联网',
      budget_limit: 680000,
      deadline: '2026-12-12T17:30:00Z',
      status: 'OPEN',
      description:
        '覆盖3条SMT与总装车间产线数据采集，需支持 OPC-UA / Modbus-TCP 协议直采并具备工业级防尘防油污 IP67 防护等级。',
      items: [
        {
          sku: 'GW-EDGE-X4',
          name: '工业边缘计算网关',
          spec: '8核ARM / 双千兆网口 / 4G+WiFi6',
          unit: '台',
          qty: 24,
          refUnitPrice: 12000,
        },
        {
          sku: 'SEN-VIB-300',
          name: '三轴高频振动温度复合传感器',
          spec: 'IP67 / RS485 / 采样率10kHz',
          unit: '只',
          qty: 120,
          refUnitPrice: 2400,
        },
        {
          sku: 'SW-IOT-LIC',
          name: '产线物联采集底座授权',
          spec: '含500点位并发采集与看板接口',
          unit: '套',
          qty: 1,
          refUnitPrice: 104000,
        },
      ],
      created_by: 'buyer-caojie',
      created_at: '2026-11-20T10:30:00Z',
      awarded_bid_id: null,
    },
    {
      id: 'RFQ-2026-003',
      title: '二号厂区高压变频节能空压机系统改造',
      category: '绿色能源设施',
      budget_limit: 920000,
      deadline: '2026-11-28T16:00:00Z',
      status: 'REVIEWING',
      description:
        '淘汰原有高能耗工频机组，替换为一级能效永磁变频螺杆空压站（含冷干机、精密过滤及余热回收系统），已完成首轮技术澄清。',
      items: [
        {
          sku: 'COMP-PM-132',
          name: '132kW 永磁变频双级压缩空压机',
          spec: '排气量 24.5m³/min / 一级能效',
          unit: '台',
          qty: 2,
          refUnitPrice: 360000,
        },
        {
          sku: 'DRY-AIR-30',
          name: '模块化吸干机与精密过滤机组',
          spec: '露点 -40℃ / 处理量 30m³/min',
          unit: '套',
          qty: 2,
          refUnitPrice: 100000,
        },
      ],
      created_by: 'buyer-caojie',
      created_at: '2026-11-10T08:15:00Z',
      awarded_bid_id: null,
    },
    {
      id: 'RFQ-2026-004',
      title: '华东研发中心模块化数据中心机柜与UPS采购',
      category: '企业数字化硬件',
      budget_limit: 1200000,
      deadline: '2026-11-05T18:00:00Z',
      status: 'AWARDED',
      description:
        '新建HPC仿真机房冷通道封闭微模块系统，含20台高密机柜、双总线精密配电及200kVA模块化UPS电源与磷酸铁锂电池组。',
      items: [
        {
          sku: 'DC-CAB-42U',
          name: '42U 冷通道高密服务器机柜',
          spec: '800×1200mm / 含智能PDU与动环传感',
          unit: '台',
          qty: 20,
          refUnitPrice: 19500,
        },
        {
          sku: 'UPS-MOD-200',
          name: '200kVA 模块化在线式UPS及锂电柜',
          spec: 'N+1冗余 / 满载备电30分钟',
          unit: '套',
          qty: 1,
          refUnitPrice: 810000,
        },
      ],
      created_by: 'buyer-caojie',
      created_at: '2026-10-22T14:00:00Z',
      awarded_bid_id: 'BID-004-HAIZHI',
    },
    {
      id: 'RFQ-2026-005',
      title: '园区分布式屋顶光伏逆变器与储能并网柜',
      category: '绿色能源设施',
      budget_limit: 1500000,
      deadline: '2026-11-01T18:00:00Z',
      status: 'AWARDED',
      description:
        '集团南方产业园 1.8MW 屋顶光伏配套组串式逆变器、高压并网开关柜及EMS能源管理系统。',
      items: [
        {
          sku: 'INV-STR-110K',
          name: '110kW 工业组串式光伏逆变器',
          spec: 'MPPT 9路 / 转换效率 98.8%',
          unit: '台',
          qty: 16,
          refUnitPrice: 48000,
        },
        {
          sku: 'ESS-CAB-500',
          name: '10kV 智能并网开关柜及EMS主机',
          spec: '含防孤岛保护与峰谷调度策略',
          unit: '套',
          qty: 2,
          refUnitPrice: 366000,
        },
      ],
      created_by: 'buyer-caojie',
      created_at: '2026-10-15T11:20:00Z',
      awarded_bid_id: 'BID-005-HUADONG',
    },
    {
      id: 'RFQ-2026-006',
      title: '新能源电池模组激光焊接夹具与视觉检测工位',
      category: '精密机电部件',
      budget_limit: 760000,
      deadline: '2026-12-25T18:00:00Z',
      status: 'OPEN',
      description:
        '适配21700/大圆柱电芯模组汇流排高速激光焊接，要求集成3D线激光焊缝缺陷检测，节拍 ≤ 1.8s/电芯。',
      items: [
        {
          sku: 'FIX-LASER-M6',
          name: '气动精密伺服激光焊接压装夹具',
          spec: '铝合金硬质阳极氧化 / 重复精度±0.02mm',
          unit: '套',
          qty: 4,
          refUnitPrice: 115000,
        },
        {
          sku: 'VIS-3D-SCAN',
          name: '高帧率3D线激光焊缝AOI视觉检测单元',
          spec: 'Z轴分辨率 2μm / 含AI缺陷分类算法',
          unit: '套',
          qty: 2,
          refUnitPrice: 150000,
        },
      ],
      created_by: 'buyer-caojie',
      created_at: '2026-11-24T09:40:00Z',
      awarded_bid_id: null,
    },
  ];

  for (const r of rfqs) {
    db.run(
      `INSERT INTO rfq_projects (id, title, category, budget_limit, deadline, status, description, items_json, created_by, created_at, awarded_bid_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        r.id,
        r.title,
        r.category,
        r.budget_limit,
        r.deadline,
        r.status,
        r.description,
        JSON.stringify(r.items),
        r.created_by,
        r.created_at,
        r.awarded_bid_id,
      ]
    );
  }

  const bids = [
    {
      id: 'BID-001-HUADONG',
      rfq_id: 'RFQ-2026-001',
      supplier_id: 'sup-huadong',
      supplier_name: '上海华东智能装备有限公司',
      total_price: 1742000,
      lead_days: 42,
      warranty_months: 24,
      proposal_note: '原厂西门子840D全新套件，含免费驻场陪产调试14天及备件包。',
      item_prices_json: JSON.stringify([
        { sku: 'CNC-5X-850', unitPrice: 718000, subtotal: 1436000 },
        { sku: 'ROBOT-LOAD-20', unitPrice: 153000, subtotal: 306000 },
      ]),
      is_winner: 0,
      submitted_at: '2026-11-22T15:10:00Z',
    },
    {
      id: 'BID-002-HAIZHI',
      rfq_id: 'RFQ-2026-002',
      supplier_id: 'sup-haizhi',
      supplier_name: '青岛海智精密制造有限公司',
      total_price: 618000,
      lead_days: 14,
      warranty_months: 36,
      proposal_note: '工业网关现货直发，提供3年质保与7×24远程运维响应。',
      item_prices_json: JSON.stringify([
        { sku: 'GW-EDGE-X4', unitPrice: 10800, subtotal: 259200 },
        { sku: 'SEN-VIB-300', unitPrice: 2150, subtotal: 258000 },
        { sku: 'SW-IOT-LIC', unitPrice: 100800, subtotal: 100800 },
      ]),
      is_winner: 0,
      submitted_at: '2026-11-23T11:20:00Z',
    },
    {
      id: 'BID-002-YUNLIAN',
      rfq_id: 'RFQ-2026-002',
      supplier_id: 'sup-yunlian',
      supplier_name: '苏州云联工业科技有限公司',
      total_price: 598400,
      lead_days: 18,
      warranty_months: 24,
      proposal_note: '自研边缘采集协议栈，免费赠送产线看板大屏模板定制开发。',
      item_prices_json: JSON.stringify([
        { sku: 'GW-EDGE-X4', unitPrice: 10500, subtotal: 252000 },
        { sku: 'SEN-VIB-300', unitPrice: 2120, subtotal: 254400 },
        { sku: 'SW-IOT-LIC', unitPrice: 92000, subtotal: 92000 },
      ]),
      is_winner: 0,
      submitted_at: '2026-11-24T09:05:00Z',
    },
    {
      id: 'BID-003-HAIZHI',
      rfq_id: 'RFQ-2026-003',
      supplier_id: 'sup-haizhi',
      supplier_name: '青岛海智精密制造有限公司',
      total_price: 836000,
      lead_days: 20,
      warranty_months: 36,
      proposal_note: '整机质保36个月，附带能效监测电表及年度免费维保巡检2次。',
      item_prices_json: JSON.stringify([
        { sku: 'COMP-PM-132', unitPrice: 328000, subtotal: 656000 },
        { sku: 'DRY-AIR-30', unitPrice: 90000, subtotal: 180000 },
      ]),
      is_winner: 0,
      submitted_at: '2026-11-19T14:40:00Z',
    },
    {
      id: 'BID-003-YUNLIAN',
      rfq_id: 'RFQ-2026-003',
      supplier_id: 'sup-yunlian',
      supplier_name: '苏州云联工业科技有限公司',
      total_price: 854000,
      lead_days: 15,
      warranty_months: 24,
      proposal_note: '15天极速交付并包旧机拆除与管路氮气吹扫，缩短产线停机窗口。',
      item_prices_json: JSON.stringify([
        { sku: 'COMP-PM-132', unitPrice: 335000, subtotal: 670000 },
        { sku: 'DRY-AIR-30', unitPrice: 92000, subtotal: 184000 },
      ]),
      is_winner: 0,
      submitted_at: '2026-11-20T16:15:00Z',
    },
    {
      id: 'BID-003-HUADONG',
      rfq_id: 'RFQ-2026-003',
      supplier_id: 'sup-huadong',
      supplier_name: '上海华东智能装备有限公司',
      total_price: 876000,
      lead_days: 25,
      warranty_months: 24,
      proposal_note: '含余热回收热水换热模块，预计每年可额外节约蒸汽费用12万元。',
      item_prices_json: JSON.stringify([
        { sku: 'COMP-PM-132', unitPrice: 344000, subtotal: 688000 },
        { sku: 'DRY-AIR-30', unitPrice: 94000, subtotal: 188000 },
      ]),
      is_winner: 0,
      submitted_at: '2026-11-21T10:00:00Z',
    },
    {
      id: 'BID-004-HAIZHI',
      rfq_id: 'RFQ-2026-004',
      supplier_id: 'sup-haizhi',
      supplier_name: '青岛海智精密制造有限公司',
      total_price: 1095000,
      lead_days: 22,
      warranty_months: 36,
      proposal_note: '高密冷通道系统一次验收通过，提供原厂UPS功率模块备机1套。',
      item_prices_json: JSON.stringify([
        { sku: 'DC-CAB-42U', unitPrice: 17500, subtotal: 350000 },
        { sku: 'UPS-MOD-200', unitPrice: 745000, subtotal: 745000 },
      ]),
      is_winner: 1,
      submitted_at: '2026-11-01T10:30:00Z',
    },
    {
      id: 'BID-004-YUNLIAN',
      rfq_id: 'RFQ-2026-004',
      supplier_id: 'sup-yunlian',
      supplier_name: '苏州云联工业科技有限公司',
      total_price: 1142000,
      lead_days: 28,
      warranty_months: 24,
      proposal_note: '含机房精密空调联动控制器及消防报警干接点改造。',
      item_prices_json: JSON.stringify([
        { sku: 'DC-CAB-42U', unitPrice: 18600, subtotal: 372000 },
        { sku: 'UPS-MOD-200', unitPrice: 770000, subtotal: 770000 },
      ]),
      is_winner: 0,
      submitted_at: '2026-11-02T14:20:00Z',
    },
    {
      id: 'BID-005-HUADONG',
      rfq_id: 'RFQ-2026-005',
      supplier_id: 'sup-huadong',
      supplier_name: '上海华东智能装备有限公司',
      total_price: 1368000,
      lead_days: 26,
      warranty_months: 60,
      proposal_note: '逆变器提供5年整机质保，免费对接电网公司并网验收手续。',
      item_prices_json: JSON.stringify([
        { sku: 'INV-STR-110K', unitPrice: 43500, subtotal: 696000 },
        { sku: 'ESS-CAB-500', unitPrice: 336000, subtotal: 672000 },
      ]),
      is_winner: 1,
      submitted_at: '2026-10-28T09:15:00Z',
    },
    {
      id: 'BID-005-SHENZHEN',
      rfq_id: 'RFQ-2026-005',
      supplier_id: 'sup-shenzhen',
      supplier_name: '深圳科创微电子有限公司',
      total_price: 1412000,
      lead_days: 30,
      warranty_months: 36,
      proposal_note: '配套AI光伏组串IV诊断软件，实时定位遮挡与热斑故障。',
      item_prices_json: JSON.stringify([
        { sku: 'INV-STR-110K', unitPrice: 45000, subtotal: 720000 },
        { sku: 'ESS-CAB-500', unitPrice: 346000, subtotal: 692000 },
      ]),
      is_winner: 0,
      submitted_at: '2026-10-29T16:45:00Z',
    },
    {
      id: 'BID-006-SHENZHEN',
      rfq_id: 'RFQ-2026-006',
      supplier_id: 'sup-shenzhen',
      supplier_name: '深圳科创微电子有限公司',
      total_price: 704000,
      lead_days: 21,
      warranty_months: 24,
      proposal_note: '3D线激光检测已通过头部电池厂量产验证，误报率 < 0.05%。',
      item_prices_json: JSON.stringify([
        { sku: 'FIX-LASER-M6', unitPrice: 106000, subtotal: 424000 },
        { sku: 'VIS-3D-SCAN', unitPrice: 140000, subtotal: 280000 },
      ]),
      is_winner: 0,
      submitted_at: '2026-11-25T13:10:00Z',
    },
  ];

  for (const b of bids) {
    db.run(
      `INSERT INTO supplier_bids (id, rfq_id, supplier_id, supplier_name, total_price, lead_days, warranty_months, proposal_note, item_prices_json, is_winner, submitted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        b.id,
        b.rfq_id,
        b.supplier_id,
        b.supplier_name,
        b.total_price,
        b.lead_days,
        b.warranty_months,
        b.proposal_note,
        b.item_prices_json,
        b.is_winner,
        b.submitted_at,
      ]
    );
  }

  persistDatabase(db);
}

export async function getDb(): Promise<Database> {
  if (!globalForDb.__supplyflowDbPromise) {
    globalForDb.__supplyflowDbPromise = (async () => {
      const SQL = await initSqlJs({
        locateFile: (file: string) =>
          path.join(process.cwd(), 'node_modules', 'sql.js', 'dist', file),
      });

      let db: Database;
      if (fs.existsSync(DB_FILE)) {
        const fileBuffer = fs.readFileSync(DB_FILE);
        db = new SQL.Database(fileBuffer);
        initializeSchema(db);
      } else {
        db = new SQL.Database();
        initializeSchema(db);
        seedIfEmpty(db);
      }
      return db;
    })();
  }
  return globalForDb.__supplyflowDbPromise;
}

export function saveDb(db: Database): void {
  persistDatabase(db);
}

export function queryAll<T extends Record<string, SqlValue>>(
  db: Database,
  sql: string,
  params: SqlValue[] = []
): T[] {
  const stmt = db.prepare(sql);
  try {
    if (params.length > 0) {
      stmt.bind(params);
    }
    const rows: T[] = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject() as T);
    }
    return rows;
  } finally {
    stmt.free();
  }
}

export function queryOne<T extends Record<string, SqlValue>>(
  db: Database,
  sql: string,
  params: SqlValue[] = []
): T | null {
  const rows = queryAll<T>(db, sql, params);
  return rows[0] ?? null;
}
