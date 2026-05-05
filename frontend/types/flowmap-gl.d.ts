// 這個檔案負責在套件尚未安裝完成前，先補上 flowmap.gl layer 的最小型別宣告。
declare module '@flowmap.gl/layers' {
  export class FlowmapLayer {
    constructor(props: any);
  }
}
