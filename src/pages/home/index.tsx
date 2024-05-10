import {
  Button,
  Dropdown,
  Flex,
  Space,
  Table,
  Tooltip,
  Typography,
  theme,
} from "antd";
import style from "./index.module.scss";
import { observer } from "mobx-react-lite";
import { Logo } from "@/components/Logo";
import { TableProps } from "antd/es/table";
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  CheckCircleFilled,
  ClearOutlined,
  DeleteOutlined,
  DownloadOutlined,
  PlusOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { useEffect, useRef, useState } from "react";
import { ImageInput } from "@/components/ImageInput";
import { gstate } from "@/global";
import { CompressOptionPannel } from "@/components/CompressOption";
import { changeLang, langList } from "@/locale";
import { homeState } from "@/states/home";
import { setTransformData } from "@/uitls/transform";
import { ImageInfo } from "@/uitls/ImageInfo";
import { Indicator } from "@/components/Indicator";
import { createDownload, formatSize, getUniqNameOnNames } from "@/functions";
import { ProgressHint } from "@/components/ProgressHint";
import JSZip from "jszip";

/**
 * 获取当前语言字符串
 * @returns
 */
function getLangStr() {
  const findLang = langList?.find((item) => item?.key == gstate.lang);
  return (findLang as any)?.label;
}

export default observer(() => {
  const fileRef = useRef<HTMLInputElement>(null);
  const { token } = theme.useToken();

  // 当前是否禁用操作
  const disabled = homeState.hasTaskRunning();

  const columns: TableProps<ImageInfo>["columns"] = [
    {
      dataIndex: "status",
      title: gstate.locale?.columnTitle.status,
      fixed: "left",
      width: 80,
      className: style.status,
      render(_, row) {
        if (row.output) {
          return (
            <CheckCircleFilled
              style={{
                fontSize: "17px",
                color: token.colorPrimary,
              }}
            />
          );
        }
        return <Indicator />;
      },
    },
    {
      dataIndex: "preview",
      width: 80,
      title: gstate.locale?.columnTitle.preview,
      render(_, row) {
        if (!row.preview) return <div className={style.preview} />;
        return (
          <div className={style.preview}>
            <img src={URL.createObjectURL(row.preview.blob)} />
          </div>
        );
      },
    },
    {
      dataIndex: "name",
      title: gstate.locale?.columnTitle.name,
      render(_, row) {
        return (
          <Typography.Text title={row.origin.name} className={style.name}>
            {row.origin.name}
          </Typography.Text>
        );
      },
    },
    {
      dataIndex: "dimension",
      // width: 130,
      align: "right",
      className: style.nowrap,
      title: gstate.locale?.columnTitle.dimension,
      render(_, row) {
        return (
          <Typography.Text type="secondary">
            {row.origin.width}*{row.origin.height}
          </Typography.Text>
        );
      },
    },
    {
      dataIndex: "newDimension",
      // width: 130,
      align: "right",
      className: style.nowrap,
      title: gstate.locale?.columnTitle.newDimension,
      render(_, row) {
        if (!row.output) return "-";
        return (
          <Typography.Text>
            {row.output!.width}*{row.output!.height}
          </Typography.Text>
        );
      },
    },
    {
      dataIndex: "size",
      // width: 100,
      align: "right",
      className: style.nowrap,
      title: gstate.locale?.columnTitle.size,
      render(_, row) {
        return (
          <Typography.Text type="secondary">
            {formatSize(row.origin.blob.size)}
          </Typography.Text>
        );
      },
    },
    {
      dataIndex: "newSize",
      // width: 100,
      align: "right",
      className: style.nowrap,
      title: gstate.locale?.columnTitle.newSize,
      render(_, row) {
        if (!row.output) return "-";
        const lower = row.origin.blob.size > row.output!.blob.size;
        const format = formatSize(row.output!.blob.size);
        if (lower) {
          return <Typography.Text type="success">{format}</Typography.Text>;
        }

        return <Typography.Text type="danger">{format}</Typography.Text>;
      },
    },
    {
      dataIndex: "decrease",
      className: style.nowrap,
      title: gstate.locale?.columnTitle.decrease,
      align: "right",
      // width: 100,
      render(_, row) {
        if (!row.output) return "-";
        const lower = row.origin.blob.size > row.output!.blob.size;
        const rate =
          (row.output!.blob.size - row.origin.blob.size) / row.origin.blob.size;
        const formatRate = (Math.abs(rate) * 100).toFixed(2) + "%";
        if (lower) {
          return (
            <Flex align="center" justify="flex-end">
              <Typography.Text type="success">
                {formatRate}&nbsp;
              </Typography.Text>
              <ArrowDownOutlined style={{ color: token.colorSuccess }} />
            </Flex>
          );
        }

        return (
          <Flex align="center" justify="flex-end">
            <Typography.Text type="danger">{formatRate}&nbsp;</Typography.Text>
            <ArrowUpOutlined style={{ color: token.colorError }} />
          </Flex>
        );
      },
    },
    {
      dataIndex: "action",
      align: "right",
      fixed: "right",
      // width: 70,
      title: gstate.locale?.columnTitle.action,
      render(_, row) {
        return (
          <Space>
            <Typography.Link
              type="secondary"
              disabled={disabled}
              onClick={() => {
                homeState.list.delete(row.key);
              }}
            >
              <Tooltip title={gstate.locale?.listAction.removeOne}>
                <DeleteOutlined />
              </Tooltip>
            </Typography.Link>
            <Typography.Link
              type="secondary"
              disabled={disabled}
              onClick={() => {
                if (row.output?.blob) {
                  createDownload(row.origin.name, row.output!.blob);
                }
              }}
            >
              <Tooltip title={gstate.locale?.listAction.downloadOne}>
                <DownloadOutlined />
              </Tooltip>
            </Typography.Link>
          </Space>
        );
      },
    },
  ];

  useEffect(setTransformData, []);

  const scrollBoxRef = useRef<HTMLDivElement>(null);
  const [scrollHeight, setScrollHeight] = useState<number>(0);

  useEffect(() => {
    const resize = () => {
      const element = scrollBoxRef.current;
      if (element) {
        const height = element.getBoundingClientRect().height;
        const th = document.querySelector(".ant-table-thead");
        const thHeight = th?.getBoundingClientRect().height ?? 0;
        setScrollHeight(height - thHeight);
      }
    };
    window.addEventListener("resize", resize);
    resize();
    return () => {
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div className={style.container}>
      {/* header */}
      <Flex align="center" justify="space-between" className={style.header}>
        <div>
          <Logo title={gstate.locale?.logo} />
        </div>
        <Space>
          <Dropdown
            menu={{
              items: langList,
              selectedKeys: [gstate.lang],
              onClick({ key }) {
                changeLang(key);
              },
            }}
          >
            <Flex className={style.locale} align="center">
              <svg viewBox="0 0 24 24" style={{ color: "currentcolor" }}>
                <path d="M12.87,15.07L10.33,12.56L10.36,12.53C12.1,10.59 13.34,8.36 14.07,6H17V4H10V2H8V4H1V6H12.17C11.5,7.92 10.44,9.75 9,11.35C8.07,10.32 7.3,9.19 6.69,8H4.69C5.42,9.63 6.42,11.17 7.67,12.56L2.58,17.58L4,19L9,14L12.11,17.11L12.87,15.07M18.5,10H16.5L12,22H14L15.12,19H19.87L21,22H23L18.5,10M15.88,17L17.5,12.67L19.12,17H15.88Z" />
              </svg>
              <Typography.Text>{getLangStr()}</Typography.Text>
            </Flex>
          </Dropdown>
        </Space>
      </Flex>

      {/* body */}
      <Flex align="stretch" className={style.main}>
        <Flex align="stretch" vertical className={style.content}>
          <Flex align="center" justify="space-between" className={style.menu}>
            <Button
              disabled={disabled}
              icon={<PlusOutlined />}
              type="primary"
              onClick={() => {
                fileRef.current?.click();
              }}
            >
              {gstate.locale?.listAction.batchAppend}
            </Button>
            <Space>
              <Tooltip title={gstate.locale?.listAction.reCompress}>
                <Button
                  disabled={disabled}
                  icon={<ReloadOutlined />}
                  onClick={() => {
                    homeState.reCompress();
                  }}
                />
              </Tooltip>
              <Button
                disabled={disabled}
                icon={<ClearOutlined />}
                onClick={() => {
                  homeState.list.clear();
                }}
              >
                {gstate.locale?.listAction.clear}
              </Button>
              <Button
                icon={<DownloadOutlined />}
                type="primary"
                disabled={disabled}
                onClick={async () => {
                  gstate.showLoading(gstate.locale?.bundleTip);
                  const zip = new JSZip();
                  const names: Set<string> = new Set();
                  for (let [_, info] of homeState.list) {
                    const uniqName = getUniqNameOnNames(
                      names,
                      info.origin.name
                    );
                    names.add(uniqName);
                    if (info.output?.blob) {
                      zip.file(uniqName, info.output.blob);
                    }
                  }
                  const result = await zip.generateAsync({
                    type: "blob",
                    compression: "DEFLATE",
                    compressionOptions: {
                      level: 6,
                    },
                  });
                  createDownload("PicSmaller.zip", result);
                  gstate.hideLoading();
                }}
              >
                {gstate.locale?.listAction.downloadAll}
              </Button>
            </Space>
            <ImageInput ref={fileRef} />
          </Flex>
          <div ref={scrollBoxRef}>
            <Table
              columns={columns}
              size="small"
              pagination={false}
              scroll={{ y: scrollHeight }}
              dataSource={Array.from(homeState.list.values())}
            />
          </div>
          <Flex align="center">
            <ProgressHint />
          </Flex>
        </Flex>
        <div className={style.side}>
          <Flex align="center" justify="space-between">
            <Typography.Text strong>
              {gstate.locale?.optionPannel.title}
            </Typography.Text>
          </Flex>
          <div>
            <CompressOptionPannel />
          </div>
          <Flex justify="flex-end">
            <Space>
              <Button
                onClick={async () => {
                  // update(DefaultCompressOption);
                  // homeState.showOption = false;
                  // await homeState.updateCompressOption(DefaultCompressOption);
                }}
              >
                {gstate.locale?.optionPannel?.resetBtn}
              </Button>
              <Button
                type="primary"
                onClick={() => {
                  // homeState.showOption = false;
                  // homeState.updateCompressOption(option);
                }}
              >
                {gstate.locale?.optionPannel?.confirmBtn}
              </Button>
            </Space>
          </Flex>
        </div>
      </Flex>
    </div>
  );
});
