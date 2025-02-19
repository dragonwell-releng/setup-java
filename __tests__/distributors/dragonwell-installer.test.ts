import {HttpClient} from '@actions/http-client';
import * as semver from 'semver';
import {DragonwellDistribution} from '../../src/distributions/dragonwell/installer';
import {IDragonwellAllVersions} from '../../src/distributions/dragonwell/models';
import * as utils from '../../src/util';
import os from 'os';

import manifestData from '../data/dragonwell.json';

describe('getAvailableVersions', () => {
  let spyHttpClient: jest.SpyInstance;
  let spyUtilGetDownloadArchiveExtension: jest.SpyInstance;

  beforeEach(() => {
    spyHttpClient = jest.spyOn(HttpClient.prototype, 'getJson');
    spyHttpClient.mockReturnValue({
      statusCode: 200,
      headers: {},
      result: manifestData
    });

    spyUtilGetDownloadArchiveExtension = jest.spyOn(
      utils,
      'getDownloadArchiveExtension'
    );
    spyUtilGetDownloadArchiveExtension.mockReturnValue('tar.gz');
  });

  afterEach(() => {
    jest.resetAllMocks();
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  const mockPlatform = (
    distribution: DragonwellDistribution,
    platform: string
  ) => {
    distribution['getPlatformOption'] = () => platform;
    const mockedExtension = platform == 'windows' ? 'zip' : 'tar.gz';
    spyUtilGetDownloadArchiveExtension.mockReturnValue(mockedExtension);
  };

  describe('getAvailableVersions', () => {
    it.each([
      ['8', 'x86', 'linux', 36],
      ['8', 'aarch64', 'linux', 33],
      ['8.6.6', 'x64', 'linux', 36],
      ['8', 'x86', 'anolis', 0],
      ['8', 'x86', 'windows', 35],
      ['8', 'x86', 'mac', 0],
      ['11', 'x64', 'linux', 36],
      ['11', 'aarch64', 'linux', 33],
      ['17', 'riscv', 'linux', 0]
    ])(
      'load available versions',
      async (
        jdkVersion: string,
        arch: string,
        platform: string,
        len: number
      ) => {
        const distribution = new DragonwellDistribution({
          version: jdkVersion,
          architecture: arch,
          packageType: 'jdk',
          checkLatest: false
        });
        mockPlatform(distribution, platform);

        const availableVersions = await distribution['getAvailableVersions']();
        expect(availableVersions).not.toBeNull();
        expect(availableVersions.length).toBe(len);
      }
    );

    it.each(['16', '16.0.1', '19'])(
      'load unsupported versions',
      async (jdkVersion: string) => {
        const distribution = new DragonwellDistribution({
          version: jdkVersion,
          architecture: 'x86',
          packageType: 'jdk',
          checkLatest: false
        });
        mockPlatform(distribution, 'linux');

        await expect(distribution['getAvailableVersions']()).rejects.toThrow(
          'Support dragonwell versions: 8, 11, 17'
        );
      }
    );
  });

  describe('findPackageForDownload', () => {
    it.each([
      [
        '8',
        'linux',
        'x64',
        'https://github.com/alibaba/dragonwell8/releases/download/dragonwell-extended-8.13.14_jdk8u352-ga/Alibaba_Dragonwell_Extended_8.13.14_x64_linux.tar.gz'
      ],
      [
        '8',
        'linux',
        'aarch64',
        'https://github.com/alibaba/dragonwell8/releases/download/dragonwell-extended-8.13.14_jdk8u352-ga/Alibaba_Dragonwell_Extended_8.13.14_aarch64_linux.tar.gz'
      ],
      [
        '8',
        'windows',
        'x64',
        'https://github.com/alibaba/dragonwell8/releases/download/dragonwell-extended-8.13.14_jdk8u352-ga/Alibaba_Dragonwell_Extended_8.13.14_x64_windows.zip'
      ],
      [
        '8.13.14',
        'linux',
        'x64',
        'https://github.com/alibaba/dragonwell8/releases/download/dragonwell-extended-8.13.14_jdk8u352-ga/Alibaba_Dragonwell_Extended_8.13.14_x64_linux.tar.gz'
      ],
      [
        '11',
        'linux',
        'x64',
        'https://github.com/alibaba/dragonwell11/releases/download/dragonwell-extended-11.0.17.13_jdk-11.0.17-ga/Alibaba_Dragonwell_Extended_11.0.17.13.8_x64_linux.tar.gz'
      ],
      [
        '11',
        'linux',
        'aarch64',
        'https://github.com/alibaba/dragonwell11/releases/download/dragonwell-extended-11.0.17.13_jdk-11.0.17-ga/Alibaba_Dragonwell_Extended_11.0.17.13.8_aarch64_linux.tar.gz'
      ],
      [
        '11',
        'windows',
        'x64',
        'https://github.com/alibaba/dragonwell11/releases/download/dragonwell-extended-11.0.17.13_jdk-11.0.17-ga/Alibaba_Dragonwell_Extended_11.0.17.13.8_x64_windows.zip'
      ],
      [
        '11',
        'alpine-linux',
        'x64',
        'https://github.com/alibaba/dragonwell11/releases/download/dragonwell-extended-11.0.17.13_jdk-11.0.17-ga/Alibaba_Dragonwell_Extended_11.0.17.13.8_x64_alpine-linux.tar.gz'
      ],
      [
        '11.0.17',
        'linux',
        'x64',
        'https://github.com/alibaba/dragonwell11/releases/download/dragonwell-extended-11.0.17.13_jdk-11.0.17-ga/Alibaba_Dragonwell_Extended_11.0.17.13.8_x64_linux.tar.gz'
      ],
      [
        '17',
        'linux',
        'x64',
        'https://github.com/alibaba/dragonwell17/releases/download/dragonwell-standard-17.0.5.0.5%2B8_jdk-17.0.5-ga/Alibaba_Dragonwell_Standard_17.0.5.0.5.8_x64_linux.tar.gz'
      ],
      [
        '17',
        'linux',
        'aarch64',
        'https://github.com/alibaba/dragonwell17/releases/download/dragonwell-standard-17.0.5.0.5%2B8_jdk-17.0.5-ga/Alibaba_Dragonwell_Standard_17.0.5.0.5.8_aarch64_linux.tar.gz'
      ],
      [
        '17',
        'windows',
        'x64',
        'https://github.com/alibaba/dragonwell17/releases/download/dragonwell-standard-17.0.5.0.5%2B8_jdk-17.0.5-ga/Alibaba_Dragonwell_Standard_17.0.5.0.5.8_x64_windows.zip'
      ],
      [
        '17',
        'alpine-linux',
        'x64',
        'https://github.com/alibaba/dragonwell17/releases/download/dragonwell-standard-17.0.5.0.5%2B8_jdk-17.0.5-ga/Alibaba_Dragonwell_Standard_17.0.5.0.5.8_x64_alpine-linux.tar.gz'
      ],
      [
        '17.0.4',
        'linux',
        'x64',
        'https://github.com/alibaba/dragonwell17/releases/download/dragonwell-standard-17.0.4.0.4%2B8_jdk-17.0.4-ga/Alibaba_Dragonwell_Standard_17.0.4.0.4%2B8_x64_linux.tar.gz'
      ]
    ])(
      'test for download link',
      async (
        jdkVersion: string,
        platform: string,
        arch: string,
        expectedLink: string
      ) => {
        const distribution = new DragonwellDistribution({
          version: jdkVersion,
          architecture: arch,
          packageType: 'jdk',
          checkLatest: false
        });
        mockPlatform(distribution, platform);

        const availableVersion = await distribution['findPackageForDownload'](
          jdkVersion
        );
        expect(availableVersion).not.toBeNull();
        expect(availableVersion.url).toBe(expectedLink);
      }
    );

    it.each([
      ['8', 'alpine-linux', 'x64'],
      ['8', 'macos', 'aarch64'],
      ['11', 'macos', 'aarch64'],
      ['17', 'linux', 'riscv']
    ])(
      'test for unsupported version',
      async (jdkVersion: string, platform: string, arch: string) => {
        const distribution = new DragonwellDistribution({
          version: jdkVersion,
          architecture: arch,
          packageType: 'jdk',
          checkLatest: false
        });
        mockPlatform(distribution, platform);

        await expect(
          distribution['findPackageForDownload'](jdkVersion)
        ).rejects.toThrow(`Cannot find satisfied version for ${jdkVersion}.`);
      }
    );
  });
});
