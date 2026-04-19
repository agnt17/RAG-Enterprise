import pytest

from plan_limits import check_file_size_limit, get_plan_limits


@pytest.mark.parametrize(
    "plan,max_mb",
    [
        ("free", 10),
        ("basic", 50),
        ("pro", 100),
    ],
)
def test_file_size_limit_allows_exact_plan_boundary(plan, max_mb):
    boundary_bytes = max_mb * 1024 * 1024

    result = check_file_size_limit(plan, boundary_bytes)

    assert result["allowed"] is True
    assert result["max_allowed_mb"] == max_mb


@pytest.mark.parametrize(
    "plan,max_mb",
    [
        ("free", 10),
        ("basic", 50),
        ("pro", 100),
    ],
)
def test_file_size_limit_rejects_above_plan_boundary(plan, max_mb):
    oversized_bytes = (max_mb * 1024 * 1024) + 1

    result = check_file_size_limit(plan, oversized_bytes)

    assert result["allowed"] is False
    assert result["max_allowed_mb"] == max_mb


def test_plan_limits_lookup_normalizes_case_and_spaces():
    pro_limits = get_plan_limits(" Pro ")

    assert pro_limits["max_file_size_mb"] == 100